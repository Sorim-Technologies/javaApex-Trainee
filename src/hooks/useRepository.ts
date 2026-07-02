import { useState, useEffect, useCallback } from "react";
import type { RepoInfo, RepoAnalysis, RepoFile } from "../types/migration";
import {
  listRepoFiles,
  getFileContent,
} from "../services/migrationService";
import {
  getDetectedComponentCategory,
  enrichAnalysisWithPomVersion,
} from "../utils/formatters";

interface UseRepositoryProps {
  step: number;
  currentToken: string;
  selectedSourceVersion: string;
  setSelectedSourceVersion: (val: string) => void;
  setRiskLevel: (val: string) => void;
  persistedFormState: any;
}

export function useRepository({
  step,
  currentToken,
  selectedSourceVersion,
  setSelectedSourceVersion,
  setRiskLevel,
  persistedFormState,
}: UseRepositoryProps) {
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepoInfo | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem("migration_wizard_selected_repo") ?? window.localStorage.getItem("migration_wizard_selected_repo");
    return raw ? JSON.parse(raw) : null;
  });
  
  const [repoAnalysis, setRepoAnalysis] = useState<RepoAnalysis | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem("migration_wizard_repo_analysis") ?? window.localStorage.getItem("migration_wizard_repo_analysis");
    return raw ? JSON.parse(raw) : null;
  });

  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [currentPath, setCurrentPath] = useState(persistedFormState?.currentPath ?? "");
  const [pathHistory, setPathHistory] = useState<string[]>(
    persistedFormState?.pathHistory?.length ? persistedFormState.pathHistory : [""]
  );

  const [selectedFile, setSelectedFile] = useState<RepoFile | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [editedContent, setEditedContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(true);

  // High-risk project states
  const [isHighRiskProject, setIsHighRiskProject] = useState(
    persistedFormState?.isHighRiskProject ?? false
  );
  const [highRiskConfirmed, setHighRiskConfirmed] = useState(
    persistedFormState?.highRiskConfirmed ?? false
  );
  const [suggestedJavaVersion, setSuggestedJavaVersion] = useState(
    persistedFormState?.suggestedJavaVersion ?? "auto"
  );
  const [detectedFrameworks, setDetectedFrameworks] = useState<{ name: string; path: string; type: string }[]>(
    persistedFormState?.detectedFrameworks ?? []
  );
  const [viewingFrameworkFile, setViewingFrameworkFile] = useState<{ name: string; path: string; content: string } | null>(null);
  const [frameworkFileLoading, setFrameworkFileLoading] = useState(false);

  // Source version selection state details
  const [userSelectedVersion, setUserSelectedVersion] = useState<string | null>(
    persistedFormState?.userSelectedVersion ?? null
  );
  const [sourceVersionStatus, setSourceVersionStatus] = useState<"detected" | "not_selected" | "unknown">(
    persistedFormState?.sourceVersionStatus ?? "unknown"
  );
  const [updateSourceVersion, setUpdateSourceVersion] = useState(
    persistedFormState?.updateSourceVersion ?? false
  );

  const [isJavaProject, setIsJavaProject] = useState<boolean | null>(
    persistedFormState?.isJavaProject ?? null
  );

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisElapsedSeconds, setAnalysisElapsedSeconds] = useState(0);
  const [repoFilesLoading, setRepoFilesLoading] = useState(false);
  const [repoAccessCheckLoading, setRepoAccessCheckLoading] = useState(false);

  const handleFileClick = useCallback(async (file: RepoFile) => {
    if (file.type === "dir") {
      setPathHistory((prev) => [...prev, file.path]);
      setCurrentPath(file.path);
      setSelectedFile(null);
      setFileContent("");
      setEditedContent("");
      setIsEditing(false);
    } else {
      setFileLoading(true);
      setSelectedFile(file);
      try {
        const response = await getFileContent(selectedRepo!.url, file.path, currentToken);
        setFileContent(response.content);
        setEditedContent(response.content);
      } catch (err) {
        // error handling
      } finally {
        setFileLoading(false);
      }
    }
  }, [selectedRepo, currentToken]);

  const navigateBack = useCallback(() => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      setPathHistory(newHistory);
      setCurrentPath(newHistory[newHistory.length - 1]);
      setSelectedFile(null);
      setFileContent("");
      setEditedContent("");
      setIsEditing(false);
    }
  }, [pathHistory]);

  const navigateToRoot = useCallback(() => {
    setPathHistory([""]);
    setCurrentPath("");
    setSelectedFile(null);
    setFileContent("");
    setEditedContent("");
    setIsEditing(false);
  }, []);

  const applyRepositoryAnalysis = useCallback((analysis: RepoAnalysis) => {
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
      index === self.findIndex((f) => f.name === fw.name)
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
  }, [setSelectedSourceVersion, setRiskLevel]);

  // Folder traversal side-effect
  useEffect(() => {
    if (step === 2 && selectedRepo) {
      setRepoFilesLoading(true);
      listRepoFiles(selectedRepo.url, currentToken, currentPath)
        .then((response) => {
          setRepoFiles(response.files);
        })
        .catch(() => {})
        .finally(() => setRepoFilesLoading(false));
    }
  }, [step, selectedRepo, currentPath, currentToken]);

  return {
    repos,
    setRepos,
    selectedRepo,
    setSelectedRepo,
    repoAnalysis,
    setRepoAnalysis,
    repoFiles,
    setRepoFiles,
    currentPath,
    setCurrentPath,
    pathHistory,
    setPathHistory,
    selectedFile,
    setSelectedFile,
    fileContent,
    setFileContent,
    editedContent,
    setEditedContent,
    isEditing,
    setIsEditing,
    fileLoading,
    setFileLoading,
    showFileExplorer,
    setShowFileExplorer,
    isHighRiskProject,
    setIsHighRiskProject,
    highRiskConfirmed,
    setHighRiskConfirmed,
    suggestedJavaVersion,
    setSuggestedJavaVersion,
    detectedFrameworks,
    setDetectedFrameworks,
    viewingFrameworkFile,
    setViewingFrameworkFile,
    frameworkFileLoading,
    setFrameworkFileLoading,
    userSelectedVersion,
    setUserSelectedVersion,
    sourceVersionStatus,
    setSourceVersionStatus,
    updateSourceVersion,
    setUpdateSourceVersion,
    isJavaProject,
    setIsJavaProject,
    analysisLoading,
    setAnalysisLoading,
    analysisElapsedSeconds,
    setAnalysisElapsedSeconds,
    repoFilesLoading,
    setRepoFilesLoading,
    repoAccessCheckLoading,
    setRepoAccessCheckLoading,
    handleFileClick,
    navigateBack,
    navigateToRoot,
    applyRepositoryAnalysis,
  };
}
export default useRepository;
