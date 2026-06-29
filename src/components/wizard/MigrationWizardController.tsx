/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DiscoveryPage from "../discovery/DiscoveryPage";
import MigrationPage from "../migration/MigrationPage";
import MigrationProgress from "../migration/MigrationProgress";
import ResultPage from "../result/ResultPage";
import StrategyPage from "../strategy/StrategyPage";
import { formatFileSize } from "../../utils/fileUtils";
import { isEnterpriseGithub, isPrivateRepoAccessError, normalizeGithubUrl } from "../../utils/githubUtils";
import StepIndicator from "./StepIndicator";
import "./styles/index.css";
import {
  fetchRepositories,
  analyzeRepository,
  analyzeRepoUrl,
  getRepoVisibility,
  listRepoFiles,
  getFileContent,
  getJavaVersions,
  getJavaVersionRecommendation,
  getConversionTypes,
  previewMigration,
  startMigration,
  getMigrationStatus,
  getMigrationLogs,
  getMigrationFossa,
} from "../../services/api";
import { API_BASE_URL } from "../../services/api";
import type {
  RepoInfo,
  RepoAnalysis,
  RepoFile,
  MigrationResult,
  ConversionType,
  MigrationPreview,
  PreviewFileDiff,
  JavaVersionRecommendationResponse,
} from "../../services/api";
import {
  getIndicatorStep,
  getStepFromPath,
  LTS_JAVA_VERSIONS,
  MIGRATION_STEPS,
  normalizeConfidence,
  STEP_ROUTES,
  WIZARD_FORM_STATE_KEY,
  WIZARD_REPO_ANALYSIS_KEY,
  WIZARD_REPO_URL_KEY,
  WIZARD_SELECTED_REPO_KEY,
} from "./model/wizardConfig";
import type {
  CodeChangeEntry,
  ConfidenceLevel,
  JavaVersionOption,
  MigrationEffort,
  PersistedWizardFormState,
  RankedJavaVersionRecommendation,
  RecommendationLevel,
  SourceInputType,
} from "./model/wizardTypes";
import { readPersistedValue, readSessionJson, writeSessionJson } from "./utils/wizardStorage";
import { styles } from "./styles/wizardInlineStyles";
import ConnectWizardStep from "../connect/ConnectWizardStep";
import DiscoveryWizardStep from "../discovery/DiscoveryWizardStep";
import StrategyWizardStep from "../strategy/StrategyWizardStep";
import MigrationWizardStep from "../migration/MigrationWizardStep";
import MigrationAnimationStep from "../migration/MigrationAnimationStep";
import MigrationProgressStep from "../migration/MigrationProgressStep";
import ResultWizardStep from "../result/ResultWizardStep";
import type { WizardScreenContext } from "./model/wizardScreenContext";
export default function MigrationWizardController({ onBackToHome }: { onBackToHome?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const persistedFormState =
    readSessionJson<PersistedWizardFormState>(WIZARD_FORM_STATE_KEY);
  const initialStep =
    typeof window !== "undefined" ? getStepFromPath(window.location.pathname) : 1;
  const generateRepoTimestamp = () => {
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, "0");

    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join("");
  };

  const buildTargetRepoUrl = (repoName: string, timestamp: string) =>
    `https://github.com/Pavithra-Sorim/${repoName || "repo"}-Migrated${timestamp}`;

  const buildTargetBranchName = (repoName: string, timestamp: string) =>
    `migration/${repoName || "repo"}-Migrated${timestamp}`;

  const getRepositoryLink = (repoValue: string | null) => {
    if (!repoValue) return null;
    return repoValue.startsWith("http") ? repoValue : `https://github.com/${repoValue}`;
  };

  const [step, setStep] = useState(() => initialStep);
  const [maxVisitedIndicatorStep, setMaxVisitedIndicatorStep] = useState(
    Math.max(persistedFormState?.maxVisitedIndicatorStep ?? 1, getIndicatorStep(initialStep))
  );
  const [repoUrl, setRepoUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    return readPersistedValue(WIZARD_REPO_URL_KEY) || "";
  });
  const [sourceInputType, setSourceInputType] = useState<SourceInputType>(
    persistedFormState?.sourceInputType ?? "github"
  );
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [zipUploadStatus, setZipUploadStatus] = useState<"idle" | "ready" | "uploading" | "success" | "error">("idle");
  const [zipUploadMessage, setZipUploadMessage] = useState("");
  const [zipUploadProgress, setZipUploadProgress] = useState(0);
  const [zipDragActive, setZipDragActive] = useState(false);
  const [zipProjectId, setZipProjectId] = useState("");
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepoInfo | null>(() =>
    readSessionJson<RepoInfo>(WIZARD_SELECTED_REPO_KEY)
  );
  const [githubToken, setGithubToken] = useState("");
  const [isPrivateRepo, setIsPrivateRepo] = useState(
    persistedFormState?.isPrivateRepo ?? false
  );
  const [patToken, setPatToken] = useState(persistedFormState?.patToken ?? "");
  const [showPatModal, setShowPatModal] = useState(false);
  const [showPatToken, setShowPatToken] = useState(false);
  const [patTokenError, setPatTokenError] = useState("");
  const urlValidation = repoUrl ? normalizeGithubUrl(repoUrl) : { valid: false, normalizedUrl: "", message: "" };
  const showEnterpriseToken = Boolean(repoUrl && isEnterpriseGithub(urlValidation.normalizedUrl || repoUrl));

  const getCurrentToken = () => {
    if (showEnterpriseToken) return githubToken.trim();
    if (isPrivateRepo) return patToken.trim() || githubToken.trim();
    if (githubToken.trim()) return githubToken.trim();
    return "";
  };

  const currentToken = useMemo(getCurrentToken, [githubToken, patToken, showEnterpriseToken, isPrivateRepo]);
  const shouldShowPatInput = showEnterpriseToken || isPrivateRepo;
  const [repoAnalysis, setRepoAnalysis] = useState<RepoAnalysis | null>(() =>
    readSessionJson<RepoAnalysis>(WIZARD_REPO_ANALYSIS_KEY)
  );
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [currentPath, setCurrentPath] = useState(persistedFormState?.currentPath ?? "");
  const [targetRepoName, setTargetRepoName] = useState(persistedFormState?.targetRepoName ?? "");
  const [targetRepoTimestamp, setTargetRepoTimestamp] = useState(
    () => persistedFormState?.targetRepoTimestamp ?? generateRepoTimestamp()
  );
  const [sourceVersions, setSourceVersions] = useState<JavaVersionOption[]>([]);
  const [targetVersions, setTargetVersions] = useState<JavaVersionOption[]>([]);
  const [selectedSourceVersion, setSelectedSourceVersion] = useState(
    persistedFormState?.selectedSourceVersion ?? "8"
  );
  const [selectedTargetVersion, setSelectedTargetVersion] = useState(
    persistedFormState?.selectedTargetVersion ?? ""
  );
  const [conversionTypes, setConversionTypes] = useState<ConversionType[]>([]);
  const [selectedConversions, setSelectedConversions] = useState<string[]>(
    persistedFormState?.selectedConversions ?? ["java_version"]
  );
  const [runTests, setRunTests] = useState(persistedFormState?.runTests ?? true);
  const [runSonar, setRunSonar] = useState(persistedFormState?.runSonar ?? false);
  const [runFossa, setRunFossa] = useState(persistedFormState?.runFossa ?? false);
  const [fixBusinessLogic, setFixBusinessLogic] = useState(
    persistedFormState?.fixBusinessLogic ?? true
  );

  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisElapsedSeconds, setAnalysisElapsedSeconds] = useState(0);
  const [repoFilesLoading, setRepoFilesLoading] = useState(false);
  const [repoAccessCheckLoading, setRepoAccessCheckLoading] = useState(false);
  const [migrationJob, setMigrationJob] = useState<MigrationResult | null>(null);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [migrationApproach, setMigrationApproach] = useState(
    persistedFormState?.migrationApproach ?? "fork"
  );
  const [riskLevel, setRiskLevel] = useState(persistedFormState?.riskLevel ?? "");
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(
    persistedFormState?.selectedFrameworks ?? []
  );
  const [isJavaProject, setIsJavaProject] = useState<boolean | null>(
    persistedFormState?.isJavaProject ?? null
  );
  const [selectedFile, setSelectedFile] = useState<RepoFile | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [editedContent, setEditedContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [pathHistory, setPathHistory] = useState<string[]>(
    persistedFormState?.pathHistory?.length ? persistedFormState.pathHistory : [""]
  );
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  
  // High-risk project states (no pom.xml/build.gradle or unknown Java version)
  const [isHighRiskProject, setIsHighRiskProject] = useState(
    persistedFormState?.isHighRiskProject ?? false
  );
  const [highRiskConfirmed, setHighRiskConfirmed] = useState(
    persistedFormState?.highRiskConfirmed ?? false
  );
  const [suggestedJavaVersion, setSuggestedJavaVersion] = useState(
    persistedFormState?.suggestedJavaVersion ?? "auto"
  );
  const [detectedFrameworks, setDetectedFrameworks] = useState<{name: string; path: string; type: string}[]>(
    persistedFormState?.detectedFrameworks ?? []
  );
  const [viewingFrameworkFile, setViewingFrameworkFile] = useState<{name: string; path: string; content: string} | null>(null);
  const [frameworkFileLoading, setFrameworkFileLoading] = useState(false);
  const [fossaResult, setFossaResult] = useState<any | null>(null);
  const [fossaLoading, setFossaLoading] = useState(false);
  // Track if user selected a version in discovery
  const [userSelectedVersion, setUserSelectedVersion] = useState<string | null>(
    persistedFormState?.userSelectedVersion ?? null
  );
  // Track if no version was detected/selected
  const [sourceVersionStatus, setSourceVersionStatus] = useState<"detected" | "not_selected" | "unknown">(
    persistedFormState?.sourceVersionStatus ?? "unknown"
  );
  // Track if user confirmed and wants to update pom.xml
  const [updateSourceVersion, setUpdateSourceVersion] = useState(
    persistedFormState?.updateSourceVersion ?? false
  );
  const [versionRecommendation, setVersionRecommendation] = useState<JavaVersionRecommendationResponse | null>(null);
  const [versionRecommendationLoading, setVersionRecommendationLoading] = useState(false);
  const [versionRecommendationError, setVersionRecommendationError] = useState("");
  const currentIndicatorStep = getIndicatorStep(step);

  const migrationApproachOptions = [
    {
      value: "fork",
      label: "Create New Repository",
      desc: "Push migrated code to a new repository in your account",
      tooltip: "Creates an entirely new repository with the migrated code in your connected GitHub account.",
      icon: "🍴",
      color: "#f59e0b",
    },
    {
      value: "branch",
      label: "Existing Repository (New Branch)",
      desc: "Push migrated code to a new branch in the source repository",
      tooltip: "Keeps the existing repository and publishes the migrated code on a separate branch for review and merge.",
      icon: "🌿",
      color: "#22c55e",
    },
  ];

  // Code diff viewer states for Result page
  const [migrationPreview, setMigrationPreview] = useState<MigrationPreview | null>(null);
  const [migrationPreviewLoading, setMigrationPreviewLoading] = useState(false);
  const [migrationPreviewError, setMigrationPreviewError] = useState("");
  const [codeChanges, setCodeChanges] = useState<CodeChangeEntry[]>([]);
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [showCodeChanges, setShowCodeChanges] = useState(true);

  // Animation progress state - starts immediately when migration begins
  const [animationProgress, setAnimationProgress] = useState(0);

  const detectJavaVersionFromPomContent = (pomContent: string): string | null => {
    const normalize = (version: string) => {
      const trimmed = version.trim();
      return trimmed.startsWith("1.") ? trimmed.replace("1.", "") : trimmed;
    };

    const lookupProperty = (propertyName: string) => {
      const escapedProperty = propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = pomContent.match(new RegExp(`<${escapedProperty}>\\s*(\\d+(?:\\.\\d+)?)\\s*</${escapedProperty}>`));
      return match ? normalize(match[1]) : null;
    };

    const directPatterns = [
      /<maven\.compiler\.source>\s*(\d+(?:\.\d+)?)\s*<\/maven\.compiler\.source>/,
      /<maven\.compiler\.target>\s*(\d+(?:\.\d+)?)\s*<\/maven\.compiler\.target>/,
      /<maven\.compiler\.release>\s*(\d+(?:\.\d+)?)\s*<\/maven\.compiler\.release>/,
      /<java\.version>\s*(\d+(?:\.\d+)?)\s*<\/java\.version>/,
      /<javaVersion>\s*(\d+(?:\.\d+)?)\s*<\/javaVersion>/,
      /<source>\s*(\d+(?:\.\d+)?)\s*<\/source>/,
    ];

    for (const pattern of directPatterns) {
      const match = pomContent.match(pattern);
      if (match) return normalize(match[1]);
    }

    const propertyPatterns = [
      /<maven\.compiler\.source>\s*\$\{([^}]+)\}\s*<\/maven\.compiler\.source>/,
      /<maven\.compiler\.target>\s*\$\{([^}]+)\}\s*<\/maven\.compiler\.target>/,
      /<maven\.compiler\.release>\s*\$\{([^}]+)\}\s*<\/maven\.compiler\.release>/,
      /<source>\s*\$\{([^}]+)\}\s*<\/source>/,
    ];

    for (const pattern of propertyPatterns) {
      const match = pomContent.match(pattern);
      if (!match) continue;
      const resolved = lookupProperty(match[1]);
      if (resolved) return resolved;
    }

    return null;
  };

  const getDetectedComponentCategory = (type: string): "Framework" | "Library" => {
    const normalizedType = type.toLowerCase();

    if (normalizedType.includes("library")) {
      return "Library";
    }

    if (
      normalizedType.includes("framework") ||
      normalizedType.includes("orm") ||
      normalizedType.includes("testing")
    ) {
      return "Framework";
    }

    return "Library";
  };

  const parseJavaVersion = (version: string) => {
    const parsed = parseInt(version, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const buildCodeChangesFromPreviewDiffs = (fileDiffs: PreviewFileDiff[]): CodeChangeEntry[] => {
    return fileDiffs.map((fileDiff) => {
      const diffLinesRaw = fileDiff.diff.split(/\r?\n/);
      const parsedDiffLines: CodeChangeEntry["diffLines"] = [];
      let oldLineNumber = 0;
      let newLineNumber = 0;

      diffLinesRaw.forEach((line) => {
        if (!line || line.startsWith("---") || line.startsWith("+++")) {
          return;
        }

        if (line.startsWith("@@")) {
          const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
          if (match) {
            oldLineNumber = Number(match[1]);
            newLineNumber = Number(match[2]);
          }
          return;
        }

        if (line.startsWith("+")) {
          parsedDiffLines.push({
            type: "add",
            lineNumber: newLineNumber,
            content: line.slice(1),
          });
          newLineNumber += 1;
          return;
        }

        if (line.startsWith("-")) {
          parsedDiffLines.push({
            type: "remove",
            lineNumber: oldLineNumber,
            content: line.slice(1),
          });
          oldLineNumber += 1;
          return;
        }

        const content = line.startsWith(" ") ? line.slice(1) : line;
        parsedDiffLines.push({
          type: "context",
          lineNumber: newLineNumber,
          content,
        });
        oldLineNumber += 1;
        newLineNumber += 1;
      });

      const additions = diffLinesRaw.filter((line) => line.startsWith("+") && !line.startsWith("+++")).length;
      const deletions = diffLinesRaw.filter((line) => line.startsWith("-") && !line.startsWith("---")).length;

      return {
        fileName: fileDiff.file_path.split("/").pop() || fileDiff.file_path,
        filePath: fileDiff.file_path,
        changeType: "modified",
        additions,
        deletions,
        oldContent: "",
        newContent: "",
        diffLines: parsedDiffLines,
      };
    });
  };

  const isDetectedDependencyStatus = (status: string) => {
    const normalizedStatus = status.trim().toLowerCase();
    return normalizedStatus === "upgraded" || normalizedStatus.startsWith("analyzing");
  };

  const getDependencyStatusLabel = (status: string) => {
    return isDetectedDependencyStatus(status)
      ? "ANALYZED"
      : status.replace(/_/g, " ").toUpperCase();
  };

  const enrichAnalysisWithPomVersion = async (analysis: RepoAnalysis, repoUrlToAnalyze: string, token: string) => {
    const javaVersionFromAnalysis = analysis.java_version || analysis.java_version_from_build;
    const needsPomFallback =
      (analysis.build_tool === "maven" || analysis.structure?.has_pom_xml) &&
      (!javaVersionFromAnalysis || javaVersionFromAnalysis === "unknown" || javaVersionFromAnalysis === "not_specified");

    if (!needsPomFallback) {
      return analysis;
    }

    try {
      const response = await getFileContent(repoUrlToAnalyze, "pom.xml", token);
      const fallbackJavaVersion = detectJavaVersionFromPomContent(response.content || "");
      if (!fallbackJavaVersion) {
        return analysis;
      }

      return {
        ...analysis,
        java_version: fallbackJavaVersion,
        java_version_from_build: fallbackJavaVersion,
        java_version_detected_from_build: true,
      };
    } catch {
      return analysis;
    }
  };

  const applyRepositoryAnalysis = (analysis: RepoAnalysis) => {
    setRepoAnalysis(analysis);
    const javaVersionFromBuild = analysis.java_version || analysis.java_version_from_build || null;
    const hasJavaIndicators =
      (Array.isArray(analysis.java_files) && analysis.java_files.length > 0) ||
      (javaVersionFromBuild !== "unknown" && javaVersionFromBuild !== null) ||
      analysis.build_tool === "maven" || analysis.build_tool === "gradle" ||
      analysis.structure?.has_pom_xml || analysis.structure?.has_build_gradle ||
      (analysis.dependencies && analysis.dependencies.length > 0);
    setIsJavaProject(hasJavaIndicators);

    const hasBuildConfig = analysis.structure?.has_pom_xml || analysis.structure?.has_build_gradle ||
      analysis.build_tool === "maven" || analysis.build_tool === "gradle";
    const hasKnownJavaVersion = javaVersionFromBuild && javaVersionFromBuild !== "unknown";

    if (hasJavaIndicators && (!hasBuildConfig || !hasKnownJavaVersion)) {
      setIsHighRiskProject(true);
      if (hasKnownJavaVersion) {
        setSuggestedJavaVersion(javaVersionFromBuild!);
        setSourceVersionStatus("detected");
      } else {
        setSuggestedJavaVersion("17");
        setSourceVersionStatus("unknown");
      }
    } else {
      setIsHighRiskProject(false);
    }

    const frameworks: { name: string; path: string; type: string }[] = [];
    if (analysis.dependencies) {
      analysis.dependencies.forEach((dep: any) => {
        const artifactId = dep.artifact_id?.toLowerCase() || "";
        const groupId = dep.group_id?.toLowerCase() || "";

        if (artifactId.includes("junit") || groupId.includes("junit")) {
          frameworks.push({ name: "JUnit", path: dep.file_path || "pom.xml", type: "Testing Framework" });
        }
        if (artifactId.includes("spring") || groupId.includes("springframework")) {
          frameworks.push({ name: "Spring Framework", path: dep.file_path || "pom.xml", type: "Application Framework" });
        }
        if (artifactId.includes("hibernate") || groupId.includes("hibernate")) {
          frameworks.push({ name: "Hibernate", path: dep.file_path || "pom.xml", type: "ORM Framework" });
        }
        if (artifactId.includes("lombok")) {
          frameworks.push({ name: "Lombok", path: dep.file_path || "pom.xml", type: "Code Generation" });
        }
        if (artifactId.includes("mockito")) {
          frameworks.push({ name: "Mockito", path: dep.file_path || "pom.xml", type: "Mocking Framework" });
        }
        if (artifactId.includes("log4j") || artifactId.includes("slf4j") || artifactId.includes("logback")) {
          frameworks.push({ name: dep.artifact_id, path: dep.file_path || "pom.xml", type: "Logging" });
        }
        if (artifactId.includes("jackson") || artifactId.includes("gson")) {
          frameworks.push({ name: dep.artifact_id, path: dep.file_path || "pom.xml", type: "JSON Processing" });
        }
        if (artifactId.includes("apache-commons") || groupId.includes("commons-")) {
          frameworks.push({ name: dep.artifact_id, path: dep.file_path || "pom.xml", type: "Utility Library" });
        }
      });
    }

    const uniqueFrameworks = frameworks.filter((fw, index, self) =>
      index === self.findIndex(f => f.name === fw.name)
    );
    setDetectedFrameworks(uniqueFrameworks);

    if (javaVersionFromBuild && javaVersionFromBuild !== "unknown") {
      setSelectedSourceVersion(javaVersionFromBuild);
    }

    const hasTests = analysis.has_tests;
    const hasBuildTool = analysis.build_tool !== null;
    if (hasTests && hasBuildTool) setRiskLevel("low");
    else if (hasBuildTool) setRiskLevel("medium");
    else setRiskLevel("high");
  };

  const uploadZipFileToBackend = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/repositories/upload-zip`, {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.detail || payload?.message || "Failed to upload ZIP file.");
    }

    return payload as {
      analysis?: RepoAnalysis;
      repoAnalysis?: RepoAnalysis;
      repository?: Partial<RepoInfo>;
      project_id?: string;
      source_id?: string;
      repo_url?: string;
      source_repo_url?: string;
      project_name?: string;
      file_name?: string;
      message?: string;
    };
  };

  const resetZipSelection = () => {
    setSelectedZipFile(null);
    setZipProjectId("");
    setZipUploadMessage("");
    setZipUploadProgress(0);
    setSelectedRepo(null);
    setRepoAnalysis(null);
    setRepoFiles([]);
    setCurrentPath("");
    setPathHistory([""]);
    setError("");
  };

  const selectZipFile = (file: File | null) => {
    resetZipSelection();
    if (!file) {
      setZipUploadStatus("idle");
      return;
    }

    const isZipFile = file.name.toLowerCase().endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed";

    if (!isZipFile) {
      setZipUploadStatus("error");
      setZipUploadMessage("Invalid file type. Please upload only a .zip file.");
      return;
    }

    setSelectedZipFile(file);
    setZipUploadStatus("ready");
    setZipUploadMessage(`Valid ZIP file selected: ${file.name} (${formatFileSize(file.size)})`);
  };

  const handleZipFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectZipFile(event.target.files?.[0] || null);
    if (event.target.files?.[0] && !event.target.files[0].name.toLowerCase().endsWith(".zip")) {
      event.target.value = "";
    }
  };

  const handleZipDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setZipDragActive(false);
    if (zipUploadStatus === "uploading") return;
    selectZipFile(event.dataTransfer.files?.[0] || null);
  };

  const handleZipContinue = async () => {
    if (!selectedZipFile) {
      setZipUploadStatus("error");
      setZipUploadMessage("Please select a .zip file before continuing.");
      setZipUploadProgress(0);
      return;
    }

    setError("");
    setLoading(true);
    setZipUploadStatus("uploading");
    setZipUploadProgress(35);
    setZipUploadMessage("Uploading and analyzing ZIP file...");

    try {
      const uploadResult = await uploadZipFileToBackend(selectedZipFile);
      const analysis = uploadResult.analysis || uploadResult.repoAnalysis;

      if (!analysis) {
        throw new Error("ZIP uploaded, but repository analysis was not returned by the backend.");
      }

      const projectId = uploadResult.project_id || uploadResult.source_id || `zip-${Date.now()}`;
      const projectName = uploadResult.project_name || selectedZipFile.name.replace(/\.zip$/i, "");
      const sourceUrl = uploadResult.repo_url || uploadResult.source_repo_url || `zip://${projectId}`;

      setZipProjectId(projectId);
      setSelectedRepo({
        name: projectName,
        full_name: projectName,
        url: sourceUrl,
        default_branch: "uploaded-zip",
        language: "Java",
        description: `Uploaded ZIP file: ${selectedZipFile.name}`,
        ...(uploadResult.repository || {}),
      } as RepoInfo);
      applyRepositoryAnalysis(analysis);
      setZipUploadStatus("success");
      setZipUploadProgress(100);
      setZipUploadMessage(uploadResult.message || `${selectedZipFile.name} uploaded and analyzed successfully.`);
      setStep(2);
    } catch (err: any) {
      const message = err?.message || "Failed to upload and analyze ZIP file.";
      setZipUploadStatus("error");
      setZipUploadProgress(0);
      setZipUploadMessage(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRepositoryContinue = async () => {
    if (!urlValidation.valid) return;

    const normalizedUrl = urlValidation.normalizedUrl;
    const token = getCurrentToken().trim();

    if (showEnterpriseToken && !token) {
      setPatTokenError("");
      setShowPatModal(true);
      return;
    }

    if (isPrivateRepo && !token) {
      setPatTokenError("");
      setShowPatModal(true);
      return;
    }

    setError("");
    setRepoAnalysis(null);
    setRepoFiles([]);
    setCurrentPath("");
    setPathHistory([""]);
    setSelectedFile(null);
    setFileContent("");
    setEditedContent("");
    setIsEditing(false);
    setIsJavaProject(null);
    setDetectedFrameworks([]);
    setSelectedRepo({
      name: normalizedUrl.split('/').pop() || "",
      full_name: normalizedUrl
        .replace(/^https?:\/\/(www\.)?github\.com\//, '')
        .replace(/^https?:\/\/(www\.)?gitlab\.com\//, ''),
      url: normalizedUrl,
      default_branch: "main",
      language: "Java",
      description: ""
    });
    setStep(2);
  };

  const handlePatModalContinue = () => {
    const token = (showEnterpriseToken ? githubToken : patToken).trim();
    if (!token) {
      setPatTokenError("Enter a GitHub Personal Access Token to continue.");
      return;
    }

    setPatTokenError("");
    setShowPatModal(false);
    void handleRepositoryContinue();
  };

  useEffect(() => {
    getJavaVersions().then((versions) => {
      setSourceVersions(versions.source_versions);
      setTargetVersions(versions.target_versions);
    });
    getConversionTypes().then(setConversionTypes);
  }, []);

  useEffect(() => {
    const routeStep = getStepFromPath(location.pathname);
    setStep((currentStep) => (routeStep !== currentStep ? routeStep : currentStep));
  }, [location.pathname]);

  useEffect(() => {
    setMaxVisitedIndicatorStep((currentMax) =>
      Math.max(currentMax, getIndicatorStep(step))
    );
  }, [step]);

  useEffect(() => {
    const targetRoute = STEP_ROUTES[step] || "/";
    const currentRoute = location.pathname.replace(/\/+$/, "") || "/";

    if (currentRoute !== targetRoute) {
      navigate(targetRoute);
    }
  }, [step, location.pathname, navigate]);

  // Load GitHub token from localStorage on component mount
  useEffect(() => {
    const token = localStorage.getItem("github_token");
    if (token) {
      setGithubToken(token);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (repoUrl) {
      window.sessionStorage.setItem(WIZARD_REPO_URL_KEY, repoUrl);
      window.localStorage.setItem(WIZARD_REPO_URL_KEY, repoUrl);
    } else {
      window.sessionStorage.removeItem(WIZARD_REPO_URL_KEY);
      window.localStorage.removeItem(WIZARD_REPO_URL_KEY);
    }
  }, [repoUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (selectedRepo) {
      const serializedRepo = JSON.stringify(selectedRepo);
      window.sessionStorage.setItem(WIZARD_SELECTED_REPO_KEY, serializedRepo);
      window.localStorage.setItem(WIZARD_SELECTED_REPO_KEY, serializedRepo);
    } else {
      window.sessionStorage.removeItem(WIZARD_SELECTED_REPO_KEY);
      window.localStorage.removeItem(WIZARD_SELECTED_REPO_KEY);
    }
  }, [selectedRepo]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (repoAnalysis) {
      const serializedAnalysis = JSON.stringify(repoAnalysis);
      window.sessionStorage.setItem(WIZARD_REPO_ANALYSIS_KEY, serializedAnalysis);
      window.localStorage.setItem(WIZARD_REPO_ANALYSIS_KEY, serializedAnalysis);
    } else {
      window.sessionStorage.removeItem(WIZARD_REPO_ANALYSIS_KEY);
      window.localStorage.removeItem(WIZARD_REPO_ANALYSIS_KEY);
    }
  }, [repoAnalysis]);

  useEffect(() => {
    writeSessionJson(WIZARD_FORM_STATE_KEY, {
      maxVisitedIndicatorStep,
      sourceInputType,
      isPrivateRepo,
      patToken,
      currentPath,
      targetRepoName,
      targetRepoTimestamp,
      selectedSourceVersion,
      selectedTargetVersion,
      selectedConversions,
      runTests,
      runSonar,
      runFossa,
      fixBusinessLogic,
      migrationApproach,
      riskLevel,
      selectedFrameworks,
      isJavaProject,
      pathHistory,
      isHighRiskProject,
      highRiskConfirmed,
      suggestedJavaVersion,
      detectedFrameworks,
      userSelectedVersion,
      sourceVersionStatus,
      updateSourceVersion,
    } satisfies PersistedWizardFormState);
  }, [
    maxVisitedIndicatorStep,
    sourceInputType,
    isPrivateRepo,
    patToken,
    currentPath,
    targetRepoName,
    targetRepoTimestamp,
    selectedSourceVersion,
    selectedTargetVersion,
    selectedConversions,
    runTests,
    runSonar,
    runFossa,
    fixBusinessLogic,
    migrationApproach,
    riskLevel,
    selectedFrameworks,
    isJavaProject,
    pathHistory,
    isHighRiskProject,
    highRiskConfirmed,
    suggestedJavaVersion,
    detectedFrameworks,
    userSelectedVersion,
    sourceVersionStatus,
    updateSourceVersion,
  ]);

  // Fetch FOSSA results for the migration job when requested or when job already has results
  useEffect(() => {
    if (migrationJob?.job_id && (runFossa || migrationJob.fossa_policy_status || migrationJob.fossa_total_dependencies)) {
      let cancelled = false;
      setFossaLoading(true);
      getMigrationFossa(migrationJob.job_id)
        .then((fossa) => {
          if (cancelled) return;
          // store a normalized result for UI-first rendering
          const normalized = {
            compliance_status: fossa.policy_status ?? migrationJob.fossa_policy_status ?? null,
            total_dependencies: fossa.total_dependencies ?? migrationJob.fossa_total_dependencies ?? 0,
            licenses: typeof fossa.license_issues === 'number' ? { UNKNOWN: fossa.license_issues } : {},
            vulnerabilities: fossa.vulnerabilities ?? (typeof fossa.vulnerabilities === 'number' ? fossa.vulnerabilities : undefined),
            outdated_dependencies: fossa.outdated_dependencies ?? migrationJob.fossa_outdated_dependencies ?? 0,
          } as any;

          setFossaResult(normalized);

          // also merge into migrationJob fields so other parts of the UI (downloads/reports) see them
          setMigrationJob((prev) => prev ? ({
            ...prev,
            fossa_policy_status: fossa.policy_status ?? prev.fossa_policy_status,
            fossa_total_dependencies: fossa.total_dependencies ?? prev.fossa_total_dependencies,
            fossa_license_issues: fossa.license_issues ?? prev.fossa_license_issues,
            fossa_vulnerabilities: fossa.vulnerabilities ?? prev.fossa_vulnerabilities,
            fossa_outdated_dependencies: fossa.outdated_dependencies ?? prev.fossa_outdated_dependencies,
          }) : prev);
        })
        .catch(() => {
          // keep silent on failure; UI will show N/A
        })
        .finally(() => { if (!cancelled) setFossaLoading(false); });

      return () => { cancelled = true; };
    }
  }, [runFossa, migrationJob?.job_id, migrationJob?.fossa_policy_status, migrationJob?.fossa_total_dependencies]);

  const detectedJavaVersion = (repoAnalysis?.java_version || repoAnalysis?.java_version_from_build || "").toString().trim();
  const detectedJavaStructureLabel = detectedJavaVersion ? `✓ Java ${detectedJavaVersion}` : "✗ Java version";
  const availableTargetVersions = useMemo(() => {
    const sourceVersionNumber = parseJavaVersion(selectedSourceVersion);
    if (sourceVersionNumber === null) {
      return [];
    }

    return targetVersions.filter((version) => {
      const targetVersionNumber = parseJavaVersion(version.value);
      return targetVersionNumber !== null && targetVersionNumber > sourceVersionNumber;
    });
  }, [selectedSourceVersion, targetVersions]);

//newchange
  const rankedJavaRecommendations = useMemo<RankedJavaVersionRecommendation[]>(() => {
    if (!repoAnalysis || availableTargetVersions.length === 0) {
      return [];
    }

    const sourceVersion = parseJavaVersion(selectedSourceVersion);
    if (sourceVersion === null) return [];

    const availableValues = new Set(availableTargetVersions.map((version) => version.value));
    const apiRecommendedVersion = versionRecommendation?.recommended_target_version;
    const apiAlternatives = (versionRecommendation?.alternatives || [])
      .filter((version) => availableValues.has(version));
    const candidateValues = Array.from(new Set([
      ...(apiRecommendedVersion ? [apiRecommendedVersion] : []),
      ...apiAlternatives,
      ...availableTargetVersions
        .filter((version) => LTS_JAVA_VERSIONS.has(version.value))
        .map((version) => version.value),
      ...[...availableTargetVersions]
        .sort((left, right) => Number(right.value) - Number(left.value))
        .map((version) => version.value),
    ])).filter((version) => availableValues.has(version));

    const dependencies = repoAnalysis.dependencies || [];
    const dependencyNames = dependencies.map(
      (dependency) => `${dependency.group_id}:${dependency.artifact_id}`.toLowerCase()
    );
    const hasLegacyJavax = dependencyNames.some((name) => name.includes("javax"));
    const hasSpring = dependencyNames.some((name) => name.includes("spring"));
    const hasHibernate = dependencyNames.some((name) => name.includes("hibernate"));
    const hasBuildConfig = Boolean(
      repoAnalysis.build_tool ||
      repoAnalysis.structure?.has_pom_xml ||
      repoAnalysis.structure?.has_build_gradle
    );
    const scored = candidateValues.map((javaVersion) => {
      const targetVersion = Number(javaVersion);
      const versionGap = targetVersion - sourceVersion;
      const isLts = LTS_JAVA_VERSIONS.has(javaVersion);
      const apiAlternativeIndex = apiAlternatives.indexOf(javaVersion);
      let score = isLts ? 40 : 4;

      if (javaVersion === apiRecommendedVersion) score += 42;
      if (apiAlternativeIndex >= 0) score += Math.max(12, 24 - apiAlternativeIndex * 4);
      if (targetVersion === 25) score += 22;
      else if (targetVersion === 21) score += 25;
      else if (targetVersion === 17) score += 20;
      else if (targetVersion === 11) score += 12;
      if (versionGap <= 4) score += 14;
      else if (versionGap <= 8) score += 10;
      else if (versionGap <= 13) score += 5;
      else score -= 4;
      if (!repoAnalysis.has_tests) score -= 5;
      if (!hasBuildConfig) score -= 7;
      if (!isLts) score -= 24;
      if ((hasSpring || hasHibernate) && targetVersion >= 25) score -= 4;
      if (hasLegacyJavax && targetVersion >= 11) score -= 4;

      let migrationEffort: MigrationEffort = versionGap <= 4 ? "Low" : versionGap <= 10 ? "Medium" : "High";
      if ((!hasBuildConfig || hasLegacyJavax || dependencies.length > 20) && migrationEffort === "Low") {
        migrationEffort = "Medium";
      } else if ((!hasBuildConfig || hasLegacyJavax) && migrationEffort === "Medium") {
        migrationEffort = "High";
      }

      let confidenceScore: ConfidenceLevel = "Medium";
      if (javaVersion === apiRecommendedVersion) {
        confidenceScore = normalizeConfidence(versionRecommendation?.confidence);
      } else if (isLts && hasBuildConfig && repoAnalysis.has_tests && versionGap <= 10) {
        confidenceScore = "High";
      } else if (!isLts || !hasBuildConfig) {
        confidenceScore = "Low";
      }

      const description = targetVersion === 25
        ? "Newest LTS option with the longest support runway and current JVM improvements."
        : targetVersion === 21
          ? "Best balance of stability, performance, and enterprise adoption with strong long-term support."
          : targetVersion === 17
            ? "Stable LTS migration target with broad framework support and a mature ecosystem."
            : targetVersion === 11
              ? "Conservative LTS upgrade path for legacy applications that need a smaller compatibility step."
              : "Useful modernization option when project constraints make a major LTS jump harder.";

      const keyBenefits = [
        isLts
          ? "LTS version with enterprise adoption"
          : "Newer Java platform capabilities",
        targetVersion >= 21
          ? "Improved JVM performance and security"
          : "Broad tooling and library compatibility",
      ];

      const potentialRisks = [
        versionGap > 10
          ? `Large Java ${selectedSourceVersion} to Java ${javaVersion} jump may expose removed JDK modules, deprecated APIs, and stricter runtime behavior.`
          : `Build plugins and all ${dependencies.length} detected dependencies should be validated on Java ${javaVersion}.`,
        hasLegacyJavax
          ? "Legacy javax dependencies may require explicit replacements or Jakarta namespace migration."
          : (hasSpring || hasHibernate)
            ? "Detected framework versions may need coordinated upgrades before the application can run on this JDK."
            : "Undetected transitive or runtime-only libraries may still impose a lower Java ceiling.",
        !repoAnalysis.has_tests
          ? "Limited automated tests reduce confidence and increase the need for regression testing."
          : !isLts
            ? "This is a non-LTS release with a short support window and weaker enterprise suitability."
            : targetVersion === 25
              ? "Some older build plugins, application servers, and libraries may not yet certify Java 25."
              : "Production runtime, CI images, and deployment infrastructure must be upgraded together.",
      ];

      return {
        javaVersion,
        recommendationLevel: "Alternative" as RecommendationLevel,
        confidenceScore,
        description,
        keyBenefits,
        potentialRisks,
        migrationEffort,
        isLts,
        score,
      };
    });

    return scored
      .sort((left, right) => right.score - left.score)
      .slice(0, Math.min(5, Math.max(3, scored.length)))
      .map((recommendation, index) => ({
        ...recommendation,
        recommendationLevel: index === 0
          ? "Highly Recommended"
          : index <= 2
            ? "Recommended"
            : "Alternative",
      }));
  }, [
    availableTargetVersions,
    repoAnalysis,
    selectedSourceVersion,
    versionRecommendation,
  ]);
//

  const plannedCodeRefactoringTooltip = useMemo(() => {
    const previewDescriptions = migrationPreview
      ? Array.from(
          new Map(
            Object.values(migrationPreview.changes.file_changes)
              .flatMap((fileChanges) => fileChanges)
              .map((change) => [change.description, change])
          ).values()
        )
      : [];

    const refactoringSteps = previewDescriptions.length > 0
      ? previewDescriptions.slice(0, 5).map((change) => {
          const occurrences = change.occurrences && change.occurrences > 1
            ? ` (${change.occurrences} matches)`
            : "";
          return `${change.description}${occurrences}`;
        })
      : [
          `Upgrade Java language and build compatibility from Java ${selectedSourceVersion} to Java ${selectedTargetVersion || "the selected target version"}`,
          "Refactor deprecated or incompatible Java APIs to supported equivalents",
          "Modernize exception handling, imports, and resource-management patterns",
          "Adjust framework and dependency usage for target-version compatibility",
        ];

    if (migrationPreview?.changes.dependencies_to_update?.length) {
      refactoringSteps.push(
        `Update ${migrationPreview.changes.dependencies_to_update.length} dependency version${migrationPreview.changes.dependencies_to_update.length === 1 ? "" : "s"} for compatibility`
      );
    } else if (repoAnalysis?.dependencies?.length) {
      refactoringSteps.push("Adjust framework and dependency usage for target-version compatibility");
    }

    if (fixBusinessLogic && !refactoringSteps.some((stepItem) => stepItem.toLowerCase().includes("business logic"))) {
      refactoringSteps.push("Apply business-logic-safe fixes where migration introduces risky behavior changes");
    }

    const endpointCount = repoAnalysis?.api_endpoints?.length ?? 0;
    if (endpointCount > 0) {
      refactoringSteps.push(`Preserve and validate ${endpointCount} detected API endpoint${endpointCount === 1 ? "" : "s"} during refactoring`);
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, color: "#0f172a" }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Planned refactoring</div>
        <div style={{ fontSize: 12, lineHeight: 1.45 }}>
          {refactoringSteps.map((stepItem, index) => (
            <div key={index} style={{ marginBottom: index === refactoringSteps.length - 1 ? 0 : 6 }}>
              {index + 1}. {stepItem}
            </div>
          ))}
        </div>
      </div>
    );
  }, [
    fixBusinessLogic,
    migrationPreview,
    repoAnalysis?.api_endpoints,
    repoAnalysis?.dependencies?.length,
    selectedSourceVersion,
    selectedTargetVersion,
  ]);

  const formattedAnalysisElapsed = `${Math.floor(analysisElapsedSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(analysisElapsedSeconds % 60).toString().padStart(2, "0")}`;

  useEffect(() => {
    if (!analysisLoading) {
      setAnalysisElapsedSeconds(0);
      return;
    }

    setAnalysisElapsedSeconds(0);
    const interval = window.setInterval(() => {
      setAnalysisElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [analysisLoading]);

  // Animation effect - starts immediately and progresses smoothly
  useEffect(() => {
    if (step === 5 && migrationJob) {
      // Start animation immediately at 10%
      setAnimationProgress(10);
      
      const animationInterval = setInterval(() => {
        setAnimationProgress(prev => {
          const actualProgress = migrationJob?.progress_percent || 0;
          const status = migrationJob?.status;
          
          // If migration is completed, go to 100%
          if (status === "completed") {
            return 100;
          }
          
          // Smoothly catch up to actual progress, or animate forward if backend is slow
          if (actualProgress > prev) {
            return actualProgress;
          }
          // Animate forward slowly if backend hasn't updated yet (go to 100% when completed)
          if (status !== "completed" && status !== "failed") {
            return Math.min(prev + 2, 100);
          }
          return prev;
        });
      }, 500);
      
      return () => clearInterval(animationInterval);
    } else if (step !== 5) {
      setAnimationProgress(0);
    }
  }, [step, migrationJob?.progress_percent, migrationJob?.status]);

  useEffect(() => {
    if (step === 2 && selectedRepo && !repoAnalysis) {
      setAnalysisLoading(true);
      setError("");

      const analyzePromise = analyzeRepoUrl(selectedRepo.url, getCurrentToken())
        .then(async (result) => enrichAnalysisWithPomVersion(result.analysis, selectedRepo.url, getCurrentToken()));

      analyzePromise
        .then((analysis) => applyRepositoryAnalysis(analysis))
        .catch((err) => {
          const message = err?.message || "Failed to analyze repository.";
          if (!getCurrentToken().trim() && !showEnterpriseToken && isPrivateRepoAccessError(message)) {
            setIsPrivateRepo(true);
            setStep(1);
            setPatTokenError("");
            setShowPatModal(true);
            setError("");
            return;
          }
          setError(message);
        })
        .finally(() => setAnalysisLoading(false));
    }
  }, [step, selectedRepo, repoAnalysis, currentToken]);

  useEffect(() => {
    if (step !== 3 || !repoAnalysis || !selectedSourceVersion) {
      if (step !== 3) {
        setVersionRecommendation(null);
        setVersionRecommendationLoading(false);
        setVersionRecommendationError("");
      }
      return;
    }

    let cancelled = false;
    setVersionRecommendationLoading(true);
    setVersionRecommendationError("");

    getJavaVersionRecommendation({
      source_java_version: selectedSourceVersion,
      detected_java_version: repoAnalysis.java_version,
      build_tool: repoAnalysis.build_tool,
      dependencies: repoAnalysis.dependencies || [],
      has_tests: repoAnalysis.has_tests,
      api_endpoint_count: repoAnalysis.api_endpoints?.length ?? 0,
      risk_level: riskLevel || "unknown",
    })
      .then((recommendation) => {
        if (cancelled) return;
        setVersionRecommendation(recommendation);
      })
      .catch((err) => {
        if (cancelled) return;
        setVersionRecommendation(null);
        setVersionRecommendationError(err?.message || "Failed to get Java version recommendation.");
      })
      .finally(() => {
        if (!cancelled) {
          setVersionRecommendationLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [step, repoAnalysis, selectedSourceVersion, riskLevel]);

  useEffect(() => {
    if (step !== 1 || sourceInputType !== "github" || !urlValidation.valid || showEnterpriseToken || isPrivateRepo || patToken.trim()) {
      setRepoAccessCheckLoading(false);
      return;
    }

    const normalizedUrl = urlValidation.normalizedUrl;
    let cancelled = false;

    const timer = setTimeout(() => {
      setRepoAccessCheckLoading(true);

      getRepoVisibility(normalizedUrl)
        .then((visibility) => {
          if (cancelled) return;
          if (visibility.requires_token) {
            setIsPrivateRepo(true);
            setPatTokenError("");
            setShowPatModal(true);
            setError("");
            return;
          }

          setIsPrivateRepo(false);
          setError("");
        })
        .catch((err) => {
          if (cancelled) return;
          const message = err?.message || "Failed to analyze repository.";
          if (isPrivateRepoAccessError(message)) {
            setIsPrivateRepo(true);
            setPatTokenError("");
            setShowPatModal(true);
            setError("");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setRepoAccessCheckLoading(false);
          }
        });
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, sourceInputType, urlValidation.valid, urlValidation.normalizedUrl, showEnterpriseToken, isPrivateRepo, patToken]);

  useEffect(() => {
    if (
      step !== 1 ||
      sourceInputType !== "github" ||
      !isPrivateRepo ||
      !urlValidation.valid ||
      currentToken.trim() ||
      showPatModal
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setPatTokenError("");
      setShowPatModal(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [step, sourceInputType, isPrivateRepo, urlValidation.valid, urlValidation.normalizedUrl, currentToken, showPatModal]);

  useEffect(() => {
    if (step === 2 && selectedRepo) {
      setRepoFilesLoading(true);
      listRepoFiles(selectedRepo.url, currentToken, currentPath)
        .then((response) => {
          setRepoFiles(response.files);
        })
        .catch((err) => setError(err.message || "Failed to list repository files."))
        .finally(() => setRepoFilesLoading(false));
    }
  }, [step, selectedRepo, currentPath, currentToken]);

  // Auto-fill target repo name when selectedRepo or target version changes
  useEffect(() => {
    if (selectedRepo) {
      const sourceRepoName = selectedRepo.name || "repo";
      setTargetRepoName(
        migrationApproach === "branch"
          ? buildTargetBranchName(sourceRepoName, targetRepoTimestamp)
          : buildTargetRepoUrl(sourceRepoName, targetRepoTimestamp)
      );
    }
  }, [selectedRepo, selectedTargetVersion, targetRepoTimestamp, migrationApproach]);

  useEffect(() => {
    if (!selectedTargetVersion || targetVersions.length === 0) {
      return;
    }

    const isStillValid = availableTargetVersions.some((version) => version.value === selectedTargetVersion);
    if (!isStillValid) {
      setSelectedTargetVersion("");
    }
  }, [availableTargetVersions, selectedTargetVersion, targetVersions.length]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let lastUpdateTime = Date.now();
    let stuckCheckInterval: ReturnType<typeof setInterval>;
    
    if (step >= 5 && migrationJob?.status && migrationJob.status !== "completed" && migrationJob.status !== "failed") {
      interval = setInterval(() => {
        getMigrationStatus(migrationJob!.job_id)
          .then((job) => {
            setMigrationJob(job);
            lastUpdateTime = Date.now();
            // Auto-advance to report when completed
            if (job.status === "completed") {
              setStep(7);
              // Fetch detailed logs
              getMigrationLogs(job.job_id).then((logs) => setMigrationLogs(logs.logs));
            }
            // Fetch logs when failed so user can see error details
            if (job.status === "failed") {
              getMigrationLogs(job.job_id).then((logs) => setMigrationLogs(logs.logs));
            }
          })
          .catch(() => setError("Failed to fetch migration status."));
      }, 2000);
      
      // Check if migration appears to be stuck (same status for > 30 seconds)
      stuckCheckInterval = setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastUpdateTime;
        if (timeSinceLastUpdate > 30000 && migrationJob?.status === "cloning") {
          setError("⚠️ Migration appears to be stuck on cloning. This may be due to a large repository or network issues. Please wait a bit longer or restart the migration.");
        }
      }, 15000);
    }
    
    return () => { 
      if (interval) clearInterval(interval);
      if (stuckCheckInterval) clearInterval(stuckCheckInterval);
    };
  }, [step, migrationJob?.job_id, migrationJob?.status]);

  const handleConversionToggle = (id: string) => {
    setSelectedConversions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleFrameworkToggle = (framework: string) => {
    setSelectedFrameworks((prev) =>
      prev.includes(framework) ? prev.filter((f) => f !== framework) : [...prev, framework]
    );
  };

  const buildMigrationRequest = () => {
    const repoName = selectedRepo?.name || selectedZipFile?.name.replace(/\.zip$/i, "") || repoUrl.split("/").pop()?.replace(".git", "") || "repo";
    const finalTargetRepoName = targetRepoName || (
      migrationApproach === "branch"
        ? buildTargetBranchName(repoName, targetRepoTimestamp)
        : buildTargetRepoUrl(repoName, targetRepoTimestamp)
    );

    const detectPlatform = (url: string) => {
      if (url.includes("gitlab.com")) return "gitlab";
      if (url.includes("github.com")) return "github";
      return "github";
    };

    return {
      source_type: sourceInputType,
      source_repo_url: selectedRepo?.url || repoUrl,
      zip_project_id: sourceInputType === "zip" ? zipProjectId : undefined,
      zip_file_name: sourceInputType === "zip" ? selectedZipFile?.name : undefined,
      target_repo_name: finalTargetRepoName,
      platform: sourceInputType === "zip" ? "zip" : detectPlatform(selectedRepo?.url || repoUrl),
      source_java_version: userSelectedVersion || selectedSourceVersion,
      target_java_version: selectedTargetVersion,
      token: currentToken,
      migration_approach: migrationApproach,
      conversion_types: selectedConversions,
      run_tests: runTests,
      run_sonar: runSonar,
      run_fossa: runFossa,
      fix_business_logic: fixBusinessLogic,
    };
  };

  useEffect(() => {
    if (step !== 4 || !selectedTargetVersion || (!selectedRepo && sourceInputType === "zip") || (!selectedRepo && !repoUrl && sourceInputType === "github")) {
      return;
    }

    let cancelled = false;
    setMigrationPreviewLoading(true);
    setMigrationPreviewError("");

    previewMigration(buildMigrationRequest())
      .then((preview) => {
        if (cancelled) return;
        setMigrationPreview(preview);
        const previewCodeChanges = buildCodeChangesFromPreviewDiffs(preview.file_diffs || []);
        setCodeChanges(previewCodeChanges);
        setSelectedDiffFile((current) => current ?? previewCodeChanges[0]?.filePath ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setMigrationPreview(null);
        setCodeChanges([]);
        setSelectedDiffFile(null);
        setMigrationPreviewError(err?.message || "Failed to preview migration changes.");
      })
      .finally(() => {
        if (!cancelled) {
          setMigrationPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    step,
    selectedTargetVersion,
    selectedRepo,
    repoUrl,
    currentToken,
    sourceInputType,
    zipProjectId,
    selectedZipFile,
    migrationApproach,
    targetRepoName,
    targetRepoTimestamp,
    selectedConversions,
    runTests,
    runSonar,
    runFossa,
    fixBusinessLogic,
    selectedSourceVersion,
    userSelectedVersion,
  ]);

  const handleStartMigration = () => {
    if (sourceInputType === "github" && !selectedRepo && !repoUrl) {
      setError("Please select a repository or enter a repository URL");
      return;
    }

    if (sourceInputType === "zip" && !selectedRepo) {
      setError("Please upload and analyze a ZIP file before starting the migration.");
      return;
    }

    if (!selectedTargetVersion) {
      setError("Please select a target Java version before starting the migration.");
      return;
    }

    // Require at least one analysis tool selected before starting migration
    if (!runSonar && !runFossa) {
      setError("Please select SonarQube or FOSSA before starting migration.");
      return;
    }

    setLoading(true);
    setError("");

    const migrationRequest = buildMigrationRequest();

    startMigration(migrationRequest)
      .then((job) => {
        setMigrationJob(job);
        setStep(5); // Go to Migration Progress step
      })
      .catch((err) => {
        console.error("Migration error:", err);
        setError(err.message || "Failed to start migration.");
        setLoading(false);
      })
      .finally(() => setLoading(false));
  };

  const resetWizard = () => {
    setStep(1);
    setMaxVisitedIndicatorStep(1);
    setRepoUrl("");
    setSourceInputType("github");
    setSelectedZipFile(null);
    setZipUploadStatus("idle");
    setZipUploadMessage("");
    setZipProjectId("");
    setRepos([]);
    setSelectedRepo(null);
    setRepoAnalysis(null);
    setRepoFiles([]);
    setCurrentPath("");
    setTargetRepoName("");
    setTargetRepoTimestamp(generateRepoTimestamp());
    setSelectedSourceVersion("8");
    setSelectedTargetVersion("17");
    setSelectedConversions(["java_version"]);
    setRunTests(true);
    setRunSonar(false);
    setLoading(false);
    setAnalysisLoading(false);
    setRepoFilesLoading(false);
    setMigrationJob(null);
    setMigrationPreview(null);
    setMigrationPreviewLoading(false);
    setMigrationPreviewError("");
    setMigrationLogs([]);
    setError("");
    setMigrationApproach("fork");
    setRiskLevel("");
    setSelectedFrameworks([]);
    setIsJavaProject(null);
    setSelectedFile(null);
    setFileContent("");
    setEditedContent("");
    setIsEditing(false);
    setPathHistory([""]);
    setShowFileExplorer(true);
    // Reset high-risk project states
    setIsHighRiskProject(false);
    setHighRiskConfirmed(false);
    setSuggestedJavaVersion("17");
    setDetectedFrameworks([]);
    setViewingFrameworkFile(null);
    setCreateStandardStructure(true);
    // Reset code diff states
    setCodeChanges([]);
    setSelectedDiffFile(null);
    setShowCodeChanges(true);

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(WIZARD_REPO_URL_KEY);
      window.sessionStorage.removeItem(WIZARD_SELECTED_REPO_KEY);
      window.sessionStorage.removeItem(WIZARD_REPO_ANALYSIS_KEY);
      window.sessionStorage.removeItem(WIZARD_FORM_STATE_KEY);
      window.localStorage.removeItem(WIZARD_REPO_URL_KEY);
      window.localStorage.removeItem(WIZARD_SELECTED_REPO_KEY);
      window.localStorage.removeItem(WIZARD_REPO_ANALYSIS_KEY);
    }
  };

  const renderStepIndicator = () => (
    <StepIndicator
      styles={styles}
      steps={MIGRATION_STEPS}
      step={step}
      currentIndicatorStep={currentIndicatorStep}
      maxVisitedIndicatorStep={maxVisitedIndicatorStep}
      onStepChange={setStep}
    />
  );

  const screenContext: WizardScreenContext = {
    API_BASE_URL,
    MIGRATION_STEPS,
    analysisLoading,
    animationProgress,
    availableTargetVersions,
    buildTargetBranchName,
    buildTargetRepoUrl,
    codeChanges,
    conversionTypes,
    currentPath,
    currentToken,
    detectedFrameworks,
    detectedJavaStructureLabel,
    editedContent,
    fileContent,
    fileLoading,
    fixBusinessLogic,
    formattedAnalysisElapsed,
    fossaLoading,
    fossaResult,
    frameworkFileLoading,
    getDependencyStatusLabel,
    getDetectedComponentCategory,
    getFileContent,
    getRepositoryLink,
    githubToken,
    handlePatModalContinue,
    handleRepositoryContinue,
    handleStartMigration,
    handleZipContinue,
    handleZipDrop,
    handleZipFileChange,
    highRiskConfirmed,
    isDetectedDependencyStatus,
    isEditing,
    isHighRiskProject,
    isJavaProject,
    isPrivateRepo,
    loading,
    migrationApproach,
    migrationApproachOptions,
    migrationJob,
    migrationLogs,
    migrationPreview,
    migrationPreviewError,
    migrationPreviewLoading,
    patToken,
    patTokenError,
    pathHistory,
    plannedCodeRefactoringTooltip,
    rankedJavaRecommendations,
    repoAccessCheckLoading,
    repoAnalysis,
    repoFiles,
    repoUrl,
    resetWizard,
    riskLevel,
    runFossa,
    runSonar,
    runTests,
    selectedConversions,
    selectedDiffFile,
    selectedFile,
    selectedRepo,
    selectedSourceVersion,
    selectedTargetVersion,
    selectedZipFile,
    setCurrentPath,
    setEditedContent,
    setError,
    setFileContent,
    setFileLoading,
    setFixBusinessLogic,
    setFrameworkFileLoading,
    setGithubToken,
    setHighRiskConfirmed,
    setIsEditing,
    setIsHighRiskProject,
    setIsJavaProject,
    setIsPrivateRepo,
    setMigrationApproach,
    setPatToken,
    setPatTokenError,
    setPathHistory,
    setRepoAnalysis,
    setRepoUrl,
    setRunFossa,
    setRunSonar,
    setRunTests,
    setSelectedConversions,
    setSelectedDiffFile,
    setSelectedFile,
    setSelectedRepo,
    setSelectedSourceVersion,
    setSelectedTargetVersion,
    setShowCodeChanges,
    setShowFileExplorer,
    setShowPatModal,
    setShowPatToken,
    setSourceInputType,
    setSourceVersionStatus,
    setStep,
    setSuggestedJavaVersion,
    setTargetRepoName,
    setUserSelectedVersion,
    setViewingFrameworkFile,
    setZipDragActive,
    showCodeChanges,
    showEnterpriseToken,
    showFileExplorer,
    showPatModal,
    showPatToken,
    sourceInputType,
    sourceVersionStatus,
    styles,
    suggestedJavaVersion,
    targetRepoName,
    targetRepoTimestamp,
    urlValidation,
    userSelectedVersion,
    versionRecommendationError,
    versionRecommendationLoading,
    viewingFrameworkFile,
    zipDragActive,
    zipUploadMessage,
    zipUploadProgress,
    zipUploadStatus,
  };

  return (
    <div className="migration-wizard-layout" style={styles.container}>
      <aside className="migration-wizard-sidebar" style={styles.stepIndicatorContainer}>{renderStepIndicator()}</aside>
      <main className="migration-wizard-main" style={styles.main}>
        {error && <div style={styles.errorBanner}><span>{error}</span><button style={styles.errorClose} onClick={() => setError("")}>×</button></div>}
        {step === 1 && <ConnectWizardStep context={screenContext} />}
        {step === 2 && <DiscoveryPage><DiscoveryWizardStep context={screenContext} /></DiscoveryPage>}
        {step === 3 && <StrategyPage><StrategyWizardStep context={screenContext} /></StrategyPage>}
        {step === 4 && <MigrationPage><MigrationWizardStep context={screenContext} /></MigrationPage>}
        {step === 5 && <MigrationPage><MigrationAnimationStep context={screenContext} /></MigrationPage>}
        {step === 6 && <MigrationProgress><MigrationProgressStep context={screenContext} /></MigrationProgress>}
        {step === 7 && <ResultPage><ResultWizardStep context={screenContext} /></ResultPage>}
      </main>
    </div>
  );
};
