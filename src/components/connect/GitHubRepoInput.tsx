interface GitHubRepoInputProps {
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
      ? "Valid Repository"
      : "Invalid Repository";
  const inputStatusClass = urlValidation.valid ? "connect-input--success" : repoUrl ? "connect-input--error" : "connect-input--neutral";

  return (
    <>
      <div className="connect-field">
        <label className="connect-label">Repository URL</label>
        <input
          type="text"
          className={`connect-input ${inputStatusClass}`}
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
          <div className={`connect-status ${urlValidation.valid ? "connect-status--success" : "connect-status--error"}`}>
            {repoStatusMessage}
          </div>
        )}
        {repoAccessCheckLoading && (
          <div className="connect-status connect-status--checking">
            Checking repository access...
          </div>
        )}
        {!repoAccessCheckLoading && isPrivateRepo && currentToken.trim() && (
          <div className="connect-status connect-status--success">
            Token added for private repository access.
          </div>
        )}
      </div>

      <div className="connect-button-row">
        <button
          className={`connect-button connect-button--primary ${canContinueRepository ? "" : "connect-button--disabled"}`}
          disabled={!canContinueRepository}
          onClick={onContinue}
        >
          Continue →<span className="connect-button__arrow" aria-hidden="true"></span>
        </button>
      </div>
    </>
  );
}
