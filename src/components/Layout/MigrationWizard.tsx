import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./MigrationWizard.css";

import { useValidation } from "../../hooks/useValidation";
import { useRepository } from "../../hooks/useRepository";
import { useMigration } from "../../hooks/useMigration";

import Connect from "../../pages/Connect/Connect";
import Discovery from "../../pages/Discovery/Discovery";
import Strategy from "../../pages/Strategy/Strategy";
import Migration from "../../pages/Migration/Migration";
import Report from "../../pages/Report/Report";

import { ProgressStepper } from "./ProgressStepper";
import { ApiEndpointCard } from "../Discovery/ApiEndpointCard";
import { ErrorDialog } from "../Report/ErrorDialog";

import Logs from "../../pages/Logs/Logs";

import {
  WIZARD_REPO_URL_KEY,
  WIZARD_SELECTED_REPO_KEY,
  WIZARD_REPO_ANALYSIS_KEY,
  WIZARD_FORM_STATE_KEY,
  STEP_ROUTES,
  getStepFromPath,
} from "../../utils/constants";
import {
  readPersistedValue,
  readSessionJson,
  writeSessionJson,
  getIndicatorStep,
  generateRepoTimestamp,
  buildTargetRepoUrl,
  buildTargetBranchName,
  parseJavaVersion,
  enrichAnalysisWithPomVersion,
} from "../../utils/formatters";
import type { PersistedWizardFormState } from "../../types/migration";
import { styles } from "../../pages/styles";
import { getJavaVersions, getConversionTypes, analyzeRepoUrl } from "../../services/migrationService";

export default function MigrationWizard({ onBackToHome }: { onBackToHome?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const persistedFormState = useMemo(() => {
    return readSessionJson<PersistedWizardFormState>(WIZARD_FORM_STATE_KEY);
  }, []);

  const initialStep = useMemo(() => {
    return typeof window !== "undefined" ? getStepFromPath(window.location.pathname) : 1;
  }, []);

  const [step, setStep] = useState(() => initialStep);
  const lastStepRef = useRef(initialStep);
  const [maxVisitedIndicatorStep, setMaxVisitedIndicatorStep] = useState(
    Math.max(persistedFormState?.maxVisitedIndicatorStep ?? 1, getIndicatorStep(initialStep))
  );

  const [repoUrl, setRepoUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    return readPersistedValue(WIZARD_REPO_URL_KEY) || "";
  });

  const [githubToken, setGithubToken] = useState("");
  const [isPrivateRepo, setIsPrivateRepo] = useState(persistedFormState?.isPrivateRepo ?? false);
  const [patToken, setPatToken] = useState(persistedFormState?.patToken ?? "");

  const { urlValidation, showEnterpriseToken, shouldShowPatInput, currentToken } = useValidation(
    repoUrl,
    githubToken,
    patToken,
    isPrivateRepo
  );

  const [selectedSourceVersion, setSelectedSourceVersion] = useState(
    persistedFormState?.selectedSourceVersion ?? "8"
  );
  const [selectedTargetVersion, setSelectedTargetVersion] = useState(
    persistedFormState?.selectedTargetVersion ?? ""
  );

  const [targetRepoTimestamp, setTargetRepoTimestamp] = useState(
    () => persistedFormState?.targetRepoTimestamp ?? generateRepoTimestamp()
  );
  const [targetRepoName, setTargetRepoName] = useState(persistedFormState?.targetRepoName ?? "");
  const [migrationApproach, setMigrationApproach] = useState(persistedFormState?.migrationApproach ?? "fork");

  const [selectedConversions, setSelectedConversions] = useState<string[]>(
    persistedFormState?.selectedConversions ?? ["java_version"]
  );
  const [runTests, setRunTests] = useState(persistedFormState?.runTests ?? true);
  const [runSonar, setRunSonar] = useState(persistedFormState?.runSonar ?? false);
  const [runFossa, setRunFossa] = useState(persistedFormState?.runFossa ?? false);
  const [fixBusinessLogic, setFixBusinessLogic] = useState(persistedFormState?.fixBusinessLogic ?? true);
  
  const [riskLevel, setRiskLevel] = useState(persistedFormState?.riskLevel ?? "");
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(
    persistedFormState?.selectedFrameworks ?? []
  );

  const [sourceVersions, setSourceVersions] = useState<{ value: string; label: string }[]>([]);
  const [targetVersions, setTargetVersions] = useState<{ value: string; label: string }[]>([]);
  const [conversionTypes, setConversionTypes] = useState<any[]>([]);

  const [error, setError] = useState<string>("");
  const [showApiEndpoints, setShowApiEndpoints] = useState(false);

  const {
    selectedRepo,
    setSelectedRepo,
    repoAnalysis,
    setRepoAnalysis,
    repoFiles,
    currentPath,
    setCurrentPath,
    pathHistory,
    setPathHistory,
    selectedFile,
    setSelectedFile,
    fileContent,
    editedContent,
    setEditedContent,
    isEditing,
    setIsEditing,
    fileLoading,
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
    repoFilesLoading,
    repoAccessCheckLoading,
    setRepoAccessCheckLoading,
    handleFileClick,
    navigateBack,
    navigateToRoot,
    applyRepositoryAnalysis,
  } = useRepository({
    step,
    currentToken,
    selectedSourceVersion,
    setSelectedSourceVersion,
    setRiskLevel,
    persistedFormState,
  });

  const {
    migrationJob,
    setMigrationJob,
    migrationLogs,
    setMigrationLogs,
    animationProgress,
    setAnimationProgress,
    loading,
    setLoading,
    versionRecommendation,
    versionRecommendationLoading,
    versionRecommendationError,
    migrationPreview,
    migrationPreviewLoading,
    migrationPreviewError,
    codeChanges,
    setCodeChanges,
    selectedDiffFile,
    setSelectedDiffFile,
    showCodeChanges,
    setShowCodeChanges,
    fossaResult,
    fossaLoading,
    handleStartMigration,
  } = useMigration({
    step,
    setStep,
    selectedRepo,
    repoUrl,
    repoAnalysis,
    selectedSourceVersion,
    selectedTargetVersion,
    setSelectedTargetVersion,
    userSelectedVersion,
    currentToken,
    migrationApproach,
    selectedConversions,
    runTests,
    runSonar,
    runFossa,
    fixBusinessLogic,
    riskLevel,
    setError,
  });

  // Calculate timer layout helper
  const formattedAnalysisElapsed = `${Math.floor(analysisElapsedSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(analysisElapsedSeconds % 60).toString().padStart(2, "0")}`;

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

  // Load initial static versions and conversion options
  useEffect(() => {
    getJavaVersions().then((versions) => {
      setSourceVersions(versions.source_versions);
      setTargetVersions(versions.target_versions);
    });
    getConversionTypes().then(setConversionTypes);
  }, []);

  // Sync step routes
  useEffect(() => {
    const routeStep = getStepFromPath(location.pathname);
    setStep((currentStep) => (routeStep !== currentStep ? routeStep : currentStep));
  }, [location.pathname]);

  useEffect(() => {
    setMaxVisitedIndicatorStep((currentMax) => Math.max(currentMax, getIndicatorStep(step)));
  }, [step]);

  useEffect(() => {
    const targetRoute = STEP_ROUTES[step] || "/";
    const currentRoute = location.pathname.replace(/\/+$/, "") || "/";

    if (currentRoute !== targetRoute) {
      if (step !== lastStepRef.current) {
        lastStepRef.current = step;
        navigate(targetRoute);
      }
    } else {
      lastStepRef.current = step;
    }

    if (step !== 6) {
      window.sessionStorage.setItem("last_wizard_path", targetRoute);
    }
  }, [step, location.pathname, navigate]);

  // Load GitHub enterprise config details if saved
  useEffect(() => {
    const token = localStorage.getItem("github_token");
    if (token) {
      setGithubToken(token);
    }
  }, []);

  // Save url and selected repo states to storage
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
      const serialized = JSON.stringify(selectedRepo);
      window.sessionStorage.setItem(WIZARD_SELECTED_REPO_KEY, serialized);
      window.localStorage.setItem(WIZARD_SELECTED_REPO_KEY, serialized);
    } else {
      window.sessionStorage.removeItem(WIZARD_SELECTED_REPO_KEY);
      window.localStorage.removeItem(WIZARD_SELECTED_REPO_KEY);
    }
  }, [selectedRepo]);

  // Reset active migration job states when a new repository is selected
  useEffect(() => {
    if (selectedRepo) {
      setMigrationJob(null);
      setMigrationLogs([]);
      setAnimationProgress(0);
    }
  }, [selectedRepo, setMigrationJob, setMigrationLogs, setAnimationProgress]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (repoAnalysis) {
      const serialized = JSON.stringify(repoAnalysis);
      window.sessionStorage.setItem(WIZARD_REPO_ANALYSIS_KEY, serialized);
      window.localStorage.setItem(WIZARD_REPO_ANALYSIS_KEY, serialized);
    } else {
      window.sessionStorage.removeItem(WIZARD_REPO_ANALYSIS_KEY);
      window.localStorage.removeItem(WIZARD_REPO_ANALYSIS_KEY);
    }
  }, [repoAnalysis]);

  // Sync entire persisted form states
  useEffect(() => {
    writeSessionJson(WIZARD_FORM_STATE_KEY, {
      maxVisitedIndicatorStep,
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

  // Check visibility access background triggers
  useEffect(() => {
    if (step !== 1 || !urlValidation.valid || showEnterpriseToken || patToken.trim()) {
      setRepoAccessCheckLoading(false);
      return;
    }
    const normalizedUrl = urlValidation.normalizedUrl;
    let cancelled = false;

    const timer = setTimeout(() => {
      setRepoAccessCheckLoading(true);
      import("../../services/migrationService")
        .then((module) => module.getRepoVisibility(normalizedUrl))
        .then((visibility) => {
          if (cancelled) return;
          if (visibility.requires_token) {
            setIsPrivateRepo(true);
            setError("This repository appears to be private. Enter a GitHub Personal Access Token to continue.");
            return;
          }
          setIsPrivateRepo(false);
          setError("");
        })
        .catch((err) => {
          if (cancelled) return;
          const msg = err?.message || "";
          if (msg.toLowerCase().includes("private") || msg.toLowerCase().includes("token")) {
            setIsPrivateRepo(true);
            setError("This repository appears to be private. Enter a GitHub Personal Access Token to continue.");
          }
        })
        .finally(() => {
          if (!cancelled) setRepoAccessCheckLoading(false);
        });
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, urlValidation.valid, urlValidation.normalizedUrl, showEnterpriseToken, patToken, setRepoAccessCheckLoading]);

  // Load and auto enrich POM logic side effects
  useEffect(() => {
    if (step === 2 && selectedRepo && !repoAnalysis) {
      setAnalysisLoading(true);
      setError("");

      analyzeRepoUrl(selectedRepo.url, currentToken)
        .then(async (result) => enrichAnalysisWithPomVersion(result.analysis, selectedRepo.url, currentToken))
        .then((analysis) => applyRepositoryAnalysis(analysis))
        .catch((err) => {
          const message = err?.message || "Failed to analyze repository.";
          const isPrivate =
            message.toLowerCase().includes("private") ||
            message.toLowerCase().includes("not found") ||
            message.toLowerCase().includes("token");

          if (!currentToken.trim() && !showEnterpriseToken && isPrivate) {
            setIsPrivateRepo(true);
            setStep(1);
            setError("This repository appears to be private. Enter a GitHub Personal Access Token to continue.");
            return;
          }
          setError(message);
        })
        .finally(() => setAnalysisLoading(false));
    }
  }, [step, selectedRepo, repoAnalysis, currentToken, applyRepositoryAnalysis, showEnterpriseToken, setAnalysisLoading]);

  // Auto-fill target repo names
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
    const isStillValid = availableTargetVersions.some((v) => v.value === selectedTargetVersion);
    if (!isStillValid) {
      setSelectedTargetVersion("");
    }
  }, [availableTargetVersions, selectedTargetVersion, targetVersions.length, setSelectedTargetVersion]);

  // Clean trigger for a new wizard cycle
  const resetWizard = () => {
    setStep(1);
    setMaxVisitedIndicatorStep(1);
    setRepoUrl("");
    setSelectedRepo(null);
    setRepoAnalysis(null);
    setSelectedSourceVersion("8");
    setSelectedTargetVersion("17");
    setSelectedConversions(["java_version"]);
    setRunTests(true);
    setRunSonar(false);
    setLoading(false);
    setAnalysisLoading(false);
    setMigrationJob(null);
    setMigrationLogs([]);
    setError("");
    setMigrationApproach("fork");
    setRiskLevel("");
    setSelectedFrameworks([]);
    setIsJavaProject(null);
    setSelectedFile(null);
    setPathHistory([""]);
    setShowFileExplorer(true);
    setIsHighRiskProject(false);
    setHighRiskConfirmed(false);
    setSuggestedJavaVersion("17");
    setDetectedFrameworks([]);
    setViewingFrameworkFile(null);
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

  const handleRepositoryContinue = async () => {
    if (!urlValidation.valid) return;
    const normalizedUrl = urlValidation.normalizedUrl;
    const token = currentToken.trim();

    if (showEnterpriseToken && !token) {
      alert("Please enter a GitHub Personal Access Token for repository analysis.");
      return;
    }

    if (isPrivateRepo && !token) {
      alert("Please enter a GitHub Personal Access Token for this private repository.");
      return;
    }

    setError("");
    setRepoAnalysis(null);
    setSelectedRepo({
      name: normalizedUrl.split("/").pop() || "",
      full_name: normalizedUrl
        .replace(/^https?:\/\/(www\.)?github\.com\//, "")
        .replace(/^https?:\/\/(www\.)?gitlab\.com\//, ""),
      url: normalizedUrl,
      default_branch: "main",
      language: "Java",
      description: "",
    });
    setStep(2);
  };

  const activeAppLayout = step === 6 
    ? { display: "block", height: "100%", width: "100%", position: "relative" as const } 
    : styles.appLayout;

  const activeMainStyle = step === 6
    ? { ...styles.main, maxWidth: 1400, padding: "32px 40px 40px" }
    : styles.main;

  return (
    <div style={styles.container}>
      <div style={activeAppLayout}>
        {step !== 6 && (
          <aside style={styles.stepIndicatorContainer}>
            <ProgressStepper
              step={step}
              setStep={setStep}
              maxVisitedIndicatorStep={maxVisitedIndicatorStep}
            />
          </aside>
        )}
        <div style={activeMainStyle}>
          <ErrorDialog error={error} onClear={() => setError("")} />

          {step === 1 && (
            <Connect
              repoUrl={repoUrl}
              setRepoUrl={setRepoUrl}
              urlValidation={urlValidation}
              handleRepositoryContinue={handleRepositoryContinue}
              shouldShowPatInput={shouldShowPatInput}
              showEnterpriseToken={showEnterpriseToken}
              githubToken={githubToken}
              setGithubToken={setGithubToken}
              patToken={patToken}
              setPatToken={setPatToken}
              repoAccessCheckLoading={repoAccessCheckLoading}
              setSelectedRepo={setSelectedRepo}
              setRepoAnalysis={setRepoAnalysis}
              setIsPrivateRepo={setIsPrivateRepo}
              setError={setError}
            />
          )}

          {step === 2 && (
            <Discovery
              selectedRepo={selectedRepo}
              repoAnalysis={repoAnalysis}
              analysisLoading={analysisLoading}
              formattedAnalysisElapsed={formattedAnalysisElapsed}
              isJavaProject={isJavaProject}
              setStep={setStep}
              setSelectedRepo={setSelectedRepo}
              setRepoAnalysis={setRepoAnalysis}
              setIsJavaProject={setIsJavaProject}
              setRepoUrl={setRepoUrl}
              detectedFrameworks={detectedFrameworks}
              isHighRiskProject={isHighRiskProject}
              setIsHighRiskProject={setIsHighRiskProject}
              highRiskConfirmed={highRiskConfirmed}
              setHighRiskConfirmed={setHighRiskConfirmed}
              suggestedJavaVersion={suggestedJavaVersion}
              setSuggestedJavaVersion={setSuggestedJavaVersion}
              setSelectedSourceVersion={setSelectedSourceVersion}
              selectedSourceVersion={selectedSourceVersion}
              sourceVersionStatus={sourceVersionStatus}
              setSourceVersionStatus={setSourceVersionStatus}
              setUserSelectedVersion={setUserSelectedVersion}
              conversionTypes={conversionTypes}
              selectedConversions={selectedConversions}
              setSelectedConversions={setSelectedConversions}
              currentPath={currentPath}
              pathHistory={pathHistory}
              navigateToRoot={navigateToRoot}
              showFileExplorer={showFileExplorer}
              setShowFileExplorer={setShowFileExplorer}
              navigateBack={navigateBack}
              repoFiles={repoFiles}
              handleFileClick={handleFileClick}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              fileLoading={fileLoading}
              isEditing={isEditing}
              editedContent={editedContent}
              setEditedContent={setEditedContent}
              fileContent={fileContent}
              viewingFrameworkFile={viewingFrameworkFile}
              setViewingFrameworkFile={setViewingFrameworkFile}
              frameworkFileLoading={frameworkFileLoading}
              setFrameworkFileLoading={setFrameworkFileLoading}
              currentToken={currentToken}
            />
          )}

          {step === 3 && (
            <Strategy
              selectedRepo={selectedRepo}
              repoAnalysis={repoAnalysis}
              riskLevel={riskLevel}
              selectedSourceVersion={selectedSourceVersion}
              setSelectedSourceVersion={setSelectedSourceVersion}
              selectedTargetVersion={selectedTargetVersion}
              setSelectedTargetVersion={setSelectedTargetVersion}
              userSelectedVersion={userSelectedVersion}
              setUserSelectedVersion={setUserSelectedVersion}
              availableTargetVersions={availableTargetVersions}
              versionRecommendation={versionRecommendation}
              versionRecommendationLoading={versionRecommendationLoading}
              versionRecommendationError={versionRecommendationError}
              migrationApproach={migrationApproach}
              setMigrationApproach={setMigrationApproach}
              targetRepoName={targetRepoName}
              setTargetRepoName={setTargetRepoName}
              setStep={setStep}
            />
          )}

          {step === 4 && (
            <Migration
              step={step}
              setStep={setStep}
              selectedRepo={selectedRepo}
              repoUrl={repoUrl}
              repoAnalysis={repoAnalysis}
              selectedSourceVersion={selectedSourceVersion}
              selectedTargetVersion={selectedTargetVersion}
              runTests={runTests}
              setRunTests={setRunTests}
              runSonar={runSonar}
              setRunSonar={setRunSonar}
              runFossa={runFossa}
              setRunFossa={setRunFossa}
              fixBusinessLogic={fixBusinessLogic}
              setFixBusinessLogic={setFixBusinessLogic}
              migrationPreview={migrationPreview}
              migrationPreviewLoading={migrationPreviewLoading}
              migrationPreviewError={migrationPreviewError}
              codeChanges={codeChanges}
              selectedDiffFile={selectedDiffFile}
              setSelectedDiffFile={setSelectedDiffFile}
              handleStartMigration={handleStartMigration}
              loading={loading}
              conversionTypes={conversionTypes}
              selectedConversions={selectedConversions}
              setSelectedConversions={setSelectedConversions}
              setShowApiEndpoints={setShowApiEndpoints}
              targetRepoName={targetRepoName}
              setTargetRepoName={setTargetRepoName}
              migrationJob={migrationJob}
              setMigrationJob={setMigrationJob}
              migrationLogs={migrationLogs}
              animationProgress={animationProgress}
              fossaResult={fossaResult}
              fossaLoading={fossaLoading}
              showCodeChanges={showCodeChanges}
              setShowCodeChanges={setShowCodeChanges}
              resetWizard={resetWizard}
              isHighRiskProject={isHighRiskProject}
              detectedFrameworks={detectedFrameworks}
              setError={setError}
            />
          )}

          {step === 5 && (
            <Migration
              step={step}
              setStep={setStep}
              selectedRepo={selectedRepo}
              repoUrl={repoUrl}
              repoAnalysis={repoAnalysis}
              selectedSourceVersion={selectedSourceVersion}
              selectedTargetVersion={selectedTargetVersion}
              runTests={runTests}
              setRunTests={setRunTests}
              runSonar={runSonar}
              setRunSonar={setRunSonar}
              runFossa={runFossa}
              setRunFossa={setRunFossa}
              fixBusinessLogic={fixBusinessLogic}
              setFixBusinessLogic={setFixBusinessLogic}
              migrationPreview={migrationPreview}
              migrationPreviewLoading={migrationPreviewLoading}
              migrationPreviewError={migrationPreviewError}
              codeChanges={codeChanges}
              selectedDiffFile={selectedDiffFile}
              setSelectedDiffFile={setSelectedDiffFile}
              handleStartMigration={handleStartMigration}
              loading={loading}
              conversionTypes={conversionTypes}
              selectedConversions={selectedConversions}
              setSelectedConversions={setSelectedConversions}
              setShowApiEndpoints={setShowApiEndpoints}
              targetRepoName={targetRepoName}
              setTargetRepoName={setTargetRepoName}
              migrationJob={migrationJob}
              setMigrationJob={setMigrationJob}
              migrationLogs={migrationLogs}
              animationProgress={animationProgress}
              fossaResult={fossaResult}
              fossaLoading={fossaLoading}
              showCodeChanges={showCodeChanges}
              setShowCodeChanges={setShowCodeChanges}
              resetWizard={resetWizard}
              isHighRiskProject={isHighRiskProject}
              detectedFrameworks={detectedFrameworks}
              setError={setError}
            />
          )}

          {step === 6 && (
            <Logs
              migrationLogs={migrationLogs}
              migrationJob={migrationJob!}
              setStep={setStep}
              selectedRepo={selectedRepo}
            />
          )}

          {step === 7 && (
            <Report
              migrationJob={migrationJob!}
              migrationLogs={migrationLogs}
              runSonar={runSonar}
              runFossa={runFossa}
              fossaResult={fossaResult}
              fossaLoading={fossaLoading}
              codeChanges={codeChanges}
              selectedDiffFile={selectedDiffFile}
              setSelectedDiffFile={setSelectedDiffFile}
              showCodeChanges={showCodeChanges}
              setShowCodeChanges={setShowCodeChanges}
              selectedRepo={selectedRepo}
              isHighRiskProject={isHighRiskProject}
              detectedFrameworks={detectedFrameworks}
              resetWizard={resetWizard}
              setStep={setStep}
            />
          )}
        </div>
      </div>

      <ApiEndpointCard
        isOpen={showApiEndpoints}
        onClose={() => setShowApiEndpoints(false)}
        repoAnalysis={repoAnalysis}
      />
    </div>
  );
}
