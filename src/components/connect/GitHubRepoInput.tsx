import type React from "react";

interface GitHubRepoInputProps {
  styles: Record<string, React.CSSProperties>;
  repoUrl: string;
  urlValidation: { valid: boolean; normalizedUrl: string; message: string };
  repoAccessCheckLoading: boolean;
  isPrivateRepo: boolean;
  currentToken: string;
  canContinueRepository: boolean;
  onRepoUrlChange: (value: string) => void;
  onContinue: () => void;
}

export default function GitHubRepoInput({
  styles,
  repoUrl,
  urlValidation,
  repoAccessCheckLoading,
  isPrivateRepo,
  currentToken,
  canContinueRepository,
  onRepoUrlChange,
  onContinue,
}: GitHubRepoInputProps) {
  const repoStatusMessage = !repoUrl
    ? ""
    : urlValidation.valid
      ? "✅ Valid Repository"
      : "❌ Invalid Repository";

  return (
    <>
      <div style={styles.field}>
        <label style={styles.label}>Repository URL</label>
        <input
          type="text"
          style={{ ...styles.input, borderColor: urlValidation.valid ? "#22c55e" : repoUrl ? "#ef4444" : "#e2e8f0" }}
          value={repoUrl}
          onChange={(event) => onRepoUrlChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canContinueRepository) {
              onContinue();
            }
          }}
          placeholder="https://github.com/owner/repository"
        />
        {repoStatusMessage && (
          <div style={{ fontSize: 12, color: urlValidation.valid ? "#16a34a" : "#dc2626", marginTop: 8, fontWeight: 700 }}>
            {repoStatusMessage}
          </div>
        )}
        {repoAccessCheckLoading && (
          <div style={{ fontSize: 12, color: "#2563eb", marginTop: 8, fontWeight: 600 }}>
            Checking repository access...
          </div>
        )}
        {!repoAccessCheckLoading && isPrivateRepo && currentToken.trim() && (
          <div style={{ fontSize: 12, color: "#16a34a", marginTop: 8, fontWeight: 700 }}>
            Token added for private repository access.
          </div>
        )}
      </div>

      <div style={styles.btnRow}>
        <button
          style={{ ...styles.primaryBtn, opacity: canContinueRepository ? 1 : 0.5 }}
          disabled={!canContinueRepository}
          onClick={onContinue}
        >
          Continue →
        </button>
      </div>
    </>
  );
}
