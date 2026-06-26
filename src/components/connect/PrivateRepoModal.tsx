import type React from "react";

interface PrivateRepoModalProps {
  styles: Record<string, React.CSSProperties>;
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
  styles,
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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 2000,
      }}
    >
      <div style={{ width: "min(460px, 100%)", background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 24px 60px rgba(15,23,42,0.25)" }}>
        <h3 id="pat-modal-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
          GitHub Personal Access Token
        </h3>
        <p style={{ margin: "8px 0 18px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          This repository needs authenticated access. Paste a PAT with repository read access to continue.
        </p>
        <label style={styles.label}>Personal Access Token</label>
        <div style={{ display: "flex", gap: 8 }}>
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
            style={{ ...styles.input, flex: 1, borderColor: patTokenError ? "#ef4444" : "#e2e8f0" }}
          />
          <button
            type="button"
            onClick={() => onShowPatTokenChange((value) => !value)}
            style={{
              minWidth: 76,
              border: "1px solid #dbe3ef",
              borderRadius: 8,
              background: "#fff",
              color: "#334155",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {showPatToken ? "Hide" : "Show"}
          </button>
        </div>
        {patTokenError && (
          <div style={{ marginTop: 8, color: "#dc2626", fontSize: 12, fontWeight: 700 }}>
            {patTokenError}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              onPatTokenErrorChange("");
              if (!currentToken.trim()) {
                onPrivateRepoChange(false);
              }
            }}
            style={{ ...styles.secondaryBtn, padding: "11px 18px" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!tokenValue.trim()}
            style={{ ...styles.primaryBtn, padding: "11px 18px", opacity: tokenValue.trim() ? 1 : 0.5 }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

