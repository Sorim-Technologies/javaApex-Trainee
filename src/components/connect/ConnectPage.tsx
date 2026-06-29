import type React from "react";
import type { SourceInputType } from "../../types/wizard";
import GitHubRepoInput from "./GitHubRepoInput";
import PrivateRepoModal from "./PrivateRepoModal";
import RepoSourceTabs from "./RepoSourceTabs";
import ZipUploadBox from "./ZipUploadBox";
import "./Connect.css";

type ZipUploadStatus = "idle" | "ready" | "uploading" | "success" | "error";

interface ConnectPageProps {
  styles?: unknown;
  sourceInputType: SourceInputType;
  isPrivateRepo: boolean;
  repoUrl: string;
  urlValidation: { valid: boolean; normalizedUrl: string; message: string };
  repoAccessCheckLoading: boolean;
  currentToken: string;
  showEnterpriseToken: boolean;
  githubToken: string;
  patToken: string;
  showPatModal: boolean;
  showPatToken: boolean;
  patTokenError: string;
  selectedZipFile: File | null;
  zipUploadStatus: ZipUploadStatus;
  zipDragActive: boolean;
  zipUploadProgress: number;
  zipUploadMessage: string;
  onSourceInputTypeChange: (value: SourceInputType) => void;
  onPrivateRepoChange: (value: boolean) => void;
  onPatModalChange: (value: boolean) => void;
  onPatTokenErrorChange: (value: string) => void;
  onErrorChange: (value: string) => void;
  onRepoUrlChange: (value: string) => void;
  onGithubTokenChange: (value: string) => void;
  onPatTokenChange: (value: string) => void;
  onShowPatTokenChange: (updater: (value: boolean) => boolean) => void;
  onSelectedRepoReset: () => void;
  onRepoAnalysisReset: () => void;
  onZipDragActiveChange: (value: boolean) => void;
  onZipFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onZipDrop: (event: React.DragEvent<HTMLLabelElement>) => void;
  onRepositoryContinue: () => void;
  onZipContinue: () => void;
  onPatModalContinue: () => void;
}

export default function ConnectPage({
  sourceInputType,
  isPrivateRepo,
  repoUrl,
  urlValidation,
  repoAccessCheckLoading,
  currentToken,
  showEnterpriseToken,
  githubToken,
  patToken,
  showPatModal,
  showPatToken,
  patTokenError,
  selectedZipFile,
  zipUploadStatus,
  zipDragActive,
  zipUploadProgress,
  zipUploadMessage,
  onSourceInputTypeChange,
  onPrivateRepoChange,
  onPatModalChange,
  onPatTokenErrorChange,
  onErrorChange,
  onRepoUrlChange,
  onGithubTokenChange,
  onPatTokenChange,
  onShowPatTokenChange,
  onSelectedRepoReset,
  onRepoAnalysisReset,
  onZipDragActiveChange,
  onZipFileChange,
  onZipDrop,
  onRepositoryContinue,
  onZipContinue,
  onPatModalContinue,
}: ConnectPageProps) {
  const repositorySourceMode = sourceInputType === "zip" ? "zip" : isPrivateRepo ? "private" : "public";
  const isGithubSelected = sourceInputType === "github";
  const isZipSelected = sourceInputType === "zip";
  const tokenValue = showEnterpriseToken ? githubToken : patToken;
  const canContinueRepository =
    urlValidation.valid &&
    !repoAccessCheckLoading &&
    (!isPrivateRepo || Boolean(currentToken.trim()));

  return (
    <div className="connect-card">
      <div className="connect-step-header">
        <div>
          <h2 className="connect-title">Connect Repository</h2>
          <p className="connect-subtitle">Choose one source and the wizard will handle access automatically.</p>
        </div>
      </div>

      <RepoSourceTabs
        repositorySourceMode={repositorySourceMode}
        onSelectPublic={() => {
          onSourceInputTypeChange("github");
          onPrivateRepoChange(false);
          onPatModalChange(false);
          onPatTokenErrorChange("");
          onErrorChange("");
        }}
        onSelectPrivate={() => {
          onSourceInputTypeChange("github");
          onPrivateRepoChange(true);
          onErrorChange("");
          if (urlValidation.valid && !currentToken.trim()) {
            onPatTokenErrorChange("");
            onPatModalChange(true);
          }
        }}
        onSelectZip={() => {
          onSourceInputTypeChange("zip");
          onPatModalChange(false);
          onErrorChange("");
        }}
      />

      {isGithubSelected && (
        <GitHubRepoInput
          repoUrl={repoUrl}
          urlValidation={urlValidation}
          repoAccessCheckLoading={repoAccessCheckLoading}
          isPrivateRepo={isPrivateRepo}
          currentToken={currentToken}
          canContinueRepository={canContinueRepository}
          onRepoUrlChange={(value) => {
            onRepoUrlChange(value);
            onSelectedRepoReset();
            onRepoAnalysisReset();
            onErrorChange("");
          }}
          onContinue={onRepositoryContinue}
        />
      )}

      {isZipSelected && (
        <ZipUploadBox
          selectedZipFile={selectedZipFile}
          zipUploadStatus={zipUploadStatus}
          zipDragActive={zipDragActive}
          zipUploadProgress={zipUploadProgress}
          zipUploadMessage={zipUploadMessage}
          onDragActiveChange={onZipDragActiveChange}
          onFileChange={onZipFileChange}
          onDrop={onZipDrop}
          onContinue={onZipContinue}
        />
      )}

      {showPatModal && (
        <PrivateRepoModal
          showEnterpriseToken={showEnterpriseToken}
          showPatToken={showPatToken}
          tokenValue={tokenValue}
          patTokenError={patTokenError}
          currentToken={currentToken}
          onGithubTokenChange={onGithubTokenChange}
          onPatTokenChange={onPatTokenChange}
          onPatTokenErrorChange={onPatTokenErrorChange}
          onShowPatTokenChange={onShowPatTokenChange}
          onPrivateRepoChange={onPrivateRepoChange}
          onClose={() => onPatModalChange(false)}
          onContinue={onPatModalContinue}
        />
      )}
    </div>
  );
}
