import { useCallback, useEffect, useMemo, useState } from "react";
import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";
import type { RepoAnalysis, RepoInfo } from "../../services/api";
import ConnectPage from "./ConnectPage";
import RepositoryAnalysisPanel from "./RepositoryAnalysisPanel";

const looksLikeAnalysis = (value: unknown): value is RepoAnalysis => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Boolean(
    "build_tool" in record ||
      "buildTool" in record ||
      "java_version" in record ||
      "javaVersion" in record ||
      "java_version_from_build" in record ||
      "dependencies" in record ||
      "detected_dependencies" in record ||
      "dependency_updates" in record ||
      "frameworks" in record ||
      "detected_frameworks" in record ||
      "technologies" in record ||
      "structure" in record ||
      "api_endpoints" in record
  );
};

const normalizeAnalysisCandidate = (value: unknown): RepoAnalysis | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  const wrappedCandidates = [
    record.analysis,
    record.repoAnalysis,
    record.repositoryAnalysis,
    record.repository_analysis,
    record.analysisData,
    record.discoveryData,
    record.migrationData,
    record.data,
    record.result,
    record.payload,
  ];

  for (const candidate of wrappedCandidates) {
    if (looksLikeAnalysis(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = normalizeAnalysisCandidate(candidate);
      if (nested) return nested;
    }
  }

  return looksLikeAnalysis(value) ? value : null;
};

const pickAnalysis = (context: WizardScreenContext, currentAnalysis: RepoAnalysis | null): RepoAnalysis | null => {
  const contextRecord = context as unknown as Record<string, unknown>;
  const candidates = [
    currentAnalysis,
    context.repositoryAnalysis,
    context.repoAnalysis,
    context.analysisData,
    context.repoData,
    context.discoveryData,
    context.migrationData,
    contextRecord.repository_analysis,
    contextRecord.analysis,
    contextRecord.latestAnalysis,
    contextRecord.scanResult,
    contextRecord.analysisResult,
  ];

  for (const candidate of candidates) {
    const analysis = normalizeAnalysisCandidate(candidate);
    if (analysis) return analysis;
  }

  return null;
};

const looksLikeRepository = (value: unknown): value is RepoInfo => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Boolean(
    "url" in record ||
      "html_url" in record ||
      "clone_url" in record ||
      "full_name" in record ||
      "fullName" in record ||
      "default_branch" in record ||
      "defaultBranch" in record ||
      "language" in record ||
      "name" in record
  );
};

const normalizeRepositoryCandidate = (value: unknown): RepoInfo | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const wrappedCandidates = [record.repository, record.repo, record.selectedRepo, record.repositoryData, record.data, record.result, record.payload];

  for (const candidate of wrappedCandidates) {
    if (looksLikeRepository(candidate)) return candidate as RepoInfo;
    if (candidate && typeof candidate === "object") {
      const nested = normalizeRepositoryCandidate(candidate);
      if (nested) return nested;
    }
  }

  return looksLikeRepository(value) ? (value as RepoInfo) : null;
};

const pickRepository = (
  context: WizardScreenContext,
  currentRepository: RepoInfo | null,
  analysis: RepoAnalysis | null,
  repoUrl: string
): RepoInfo | null => {
  const contextRecord = context as unknown as Record<string, unknown>;
  const candidates = [
    currentRepository,
    context.repository,
    context.repositoryData,
    context.selectedRepo,
    context.repoData,
    context.discoveryData,
    context.migrationData,
    contextRecord.repository_analysis,
    contextRecord.analysis,
    contextRecord.latestAnalysis,
    contextRecord.scanResult,
    contextRecord.analysisResult,
  ];

  for (const candidate of candidates) {
    const repository = normalizeRepositoryCandidate(candidate);
    if (repository) return repository;
  }

  if (!analysis && !repoUrl.trim()) return null;

  const analysisRecord = (analysis || {}) as Record<string, unknown>;
  const fullName =
    String(analysisRecord.full_name || analysisRecord.fullName || "") ||
    repoUrl.replace(/^https?:\/\/(www\.)?(github|gitlab)\.com\//, "").replace(/\.git$/, "");
  const name = String(analysisRecord.name || "") || fullName.split("/").filter(Boolean).pop() || "";
  const defaultBranch = String(analysisRecord.default_branch || analysisRecord.defaultBranch || "");

  return {
    name,
    full_name: fullName || name,
    url: repoUrl,
    default_branch: defaultBranch,
    language: (analysisRecord.language as string | null | undefined) || null,
    description: null,
  };
};

export default function ConnectWizardStep({ context }: { context: WizardScreenContext }) {
  const {
    currentToken,
    githubToken,
    handlePatModalContinue,
    handleRepositoryContinue,
    handleZipContinue,
    handleZipDrop,
    handleZipFileChange,
    isPrivateRepo,
    patToken,
    patTokenError,
    repoAccessCheckLoading,
    repoAnalysis,
    repoUrl,
    selectedRepo,
    selectedZipFile,
    setError,
    setGithubToken,
    setIsPrivateRepo,
    setPatToken,
    setPatTokenError,
    setRepoAnalysis,
    setRepoUrl,
    setSelectedRepo,
    setShowPatModal,
    setShowPatToken,
    setSourceInputType,
    setZipDragActive,
    showEnterpriseToken,
    showPatModal,
    showPatToken,
    sourceInputType,
    styles,
    urlValidation,
    zipDragActive,
    zipUploadMessage,
    zipUploadProgress,
    zipUploadStatus,
  } = context;

  const canContinueRepository =
    urlValidation.valid &&
    !repoAccessCheckLoading &&
    (!isPrivateRepo || Boolean(currentToken.trim()));

  const latestRepoAnalysis = useMemo(() => pickAnalysis(context, repoAnalysis), [context, repoAnalysis]);
  const latestSelectedRepo = useMemo(
    () => pickRepository(context, selectedRepo, latestRepoAnalysis, repoUrl),
    [context, selectedRepo, latestRepoAnalysis, repoUrl]
  );

  const [displayRepoAnalysis, setDisplayRepoAnalysis] = useState<RepoAnalysis | null>(latestRepoAnalysis);
  const [displaySelectedRepo, setDisplaySelectedRepo] = useState<RepoInfo | null>(latestSelectedRepo);
  const [analysisRefreshPending, setAnalysisRefreshPending] = useState(false);

  useEffect(() => {
    setDisplayRepoAnalysis(latestRepoAnalysis);
  }, [latestRepoAnalysis]);

  useEffect(() => {
    setDisplaySelectedRepo(latestSelectedRepo);
  }, [latestSelectedRepo]);

  const refreshDisplayedAnalysis = useCallback(() => {
    const freshAnalysis = pickAnalysis(context, repoAnalysis);
    setDisplayRepoAnalysis(freshAnalysis);
    setDisplaySelectedRepo(pickRepository(context, selectedRepo, freshAnalysis, repoUrl));
  }, [context, repoAnalysis, selectedRepo, repoUrl]);


  useEffect(() => {
    if (!repoAccessCheckLoading && urlValidation.valid) {
      refreshDisplayedAnalysis();
      window.setTimeout(refreshDisplayedAnalysis, 0);
      window.setTimeout(refreshDisplayedAnalysis, 300);
    }
  }, [repoAccessCheckLoading, urlValidation.valid, refreshDisplayedAnalysis]);

  const handleRepositoryContinueAndRefresh = useCallback(async () => {
    setAnalysisRefreshPending(true);
    try {
      await handleRepositoryContinue();
    } finally {
      // The parent wizard mutates analysis state asynchronously in some flows.
      // Refresh across the next few ticks so the embedded analysis section does not
      // wait for page navigation/remount to receive the latest data.
      refreshDisplayedAnalysis();
      window.setTimeout(refreshDisplayedAnalysis, 0);
      window.setTimeout(refreshDisplayedAnalysis, 300);
      window.setTimeout(() => {
        refreshDisplayedAnalysis();
        setAnalysisRefreshPending(false);
      }, 800);
    }
  }, [handleRepositoryContinue, refreshDisplayedAnalysis]);

  return (
    <div className="connect-layout connect-layout--merged">
      <ConnectPage
        styles={styles}
        sourceInputType={sourceInputType}
        isPrivateRepo={isPrivateRepo}
        repoUrl={repoUrl}
        urlValidation={urlValidation}
        repoAccessCheckLoading={repoAccessCheckLoading}
        currentToken={currentToken}
        showEnterpriseToken={showEnterpriseToken}
        githubToken={githubToken}
        patToken={patToken}
        showPatModal={showPatModal}
        showPatToken={showPatToken}
        patTokenError={patTokenError}
        selectedZipFile={selectedZipFile}
        zipUploadStatus={zipUploadStatus}
        zipDragActive={zipDragActive}
        zipUploadProgress={zipUploadProgress}
        zipUploadMessage={zipUploadMessage}
        onSourceInputTypeChange={setSourceInputType}
        onPrivateRepoChange={setIsPrivateRepo}
        onPatModalChange={setShowPatModal}
        onPatTokenErrorChange={setPatTokenError}
        onErrorChange={setError}
        onRepoUrlChange={setRepoUrl}
        onGithubTokenChange={setGithubToken}
        onPatTokenChange={setPatToken}
        onShowPatTokenChange={setShowPatToken}
        onSelectedRepoReset={() => setSelectedRepo(null)}
        onRepoAnalysisReset={() => setRepoAnalysis(null)}
        onZipDragActiveChange={setZipDragActive}
        onZipFileChange={handleZipFileChange}
        onZipDrop={handleZipDrop}
        onRepositoryContinue={() => void handleRepositoryContinueAndRefresh()}
        onZipContinue={() => void handleZipContinue()}
        onPatModalContinue={handlePatModalContinue}
      />

      <RepositoryAnalysisPanel
        sourceInputType={sourceInputType}
        repoUrl={repoUrl}
        urlValidation={urlValidation}
        repoAccessCheckLoading={repoAccessCheckLoading || analysisRefreshPending}
        isPrivateRepo={isPrivateRepo}
        canContinueRepository={canContinueRepository}
        selectedRepo={displaySelectedRepo}
        repoAnalysis={displayRepoAnalysis}
        selectedZipFile={selectedZipFile}
        zipUploadStatus={zipUploadStatus}
        onRetry={() => void handleRepositoryContinueAndRefresh()}
      />
    </div>
  );
}
