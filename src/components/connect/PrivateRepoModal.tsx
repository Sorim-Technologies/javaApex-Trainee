interface PrivateRepoModalProps {
  showEnterpriseToken: boolean;
  showPatToken: boolean;
  tokenValue: string;
  patTokenError: string;
  currentToken: string;
  onGithubTokenChange: (value: string) => void;
  onPatTokenChange: (value: string) => void;
  onPatTokenErrorChange: (value: string) => void;
  onShowPatTokenChange: (updater: (value: boolean) => boolean) => void;
  onPrivateRepoChange: (value: boolean) => void;
  onClose: () => void;
  onContinue: () => void;
}

export default function PrivateRepoModal({
  showEnterpriseToken,
  showPatToken,
  tokenValue,
  patTokenError,
  currentToken,
  onGithubTokenChange,
  onPatTokenChange,
  onPatTokenErrorChange,
  onShowPatTokenChange,
  onPrivateRepoChange,
  onClose,
  onContinue,
}: PrivateRepoModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pat-modal-title"
      className="connect-modal-overlay"
    >
      <div className="connect-modal">
        <h3 id="pat-modal-title" className="connect-modal-title">
          GitHub Personal Access Token
        </h3>
        <p className="connect-modal-description">
          This repository needs authenticated access. Paste a PAT with repository read access to continue.
        </p>
        <label className="connect-label">Personal Access Token</label>
        <div className="connect-token-row">
          <input
            type={showPatToken ? "text" : "password"}
            value={tokenValue}
            onChange={(event) => {
              if (showEnterpriseToken) {
                onGithubTokenChange(event.target.value);
              } else {
                onPatTokenChange(event.target.value);
              }
              onPatTokenErrorChange("");
            }}
            placeholder="Paste your GitHub PAT"
            autoComplete="off"
            className={`connect-input connect-input--token ${patTokenError ? "connect-input--error" : "connect-input--neutral"}`}
          />
          <button
            type="button"
            onClick={() => onShowPatTokenChange((value) => !value)}
            className="connect-token-toggle"
          >
            {showPatToken ? "Hide" : "Show"}
          </button>
        </div>
        {patTokenError && (
          <div className="connect-modal-error">
            {patTokenError}
          </div>
        )}
        <div className="connect-modal-actions">
          <button
            type="button"
            onClick={() => {
              onClose();
              onPatTokenErrorChange("");
              if (!currentToken.trim()) {
                onPrivateRepoChange(false);
              }
            }}
            className="connect-button connect-button--secondary connect-button--compact"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!tokenValue.trim()}
            className={`connect-button connect-button--primary connect-button--compact ${tokenValue.trim() ? "" : "connect-button--disabled"}`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
