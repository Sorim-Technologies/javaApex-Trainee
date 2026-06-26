import type React from "react";
import type { SourceInputType } from "../../types/wizard";

type RepositorySourceMode = SourceInputType | "public" | "private";

interface RepoSourceTabsProps {
  repositorySourceMode: RepositorySourceMode;
  onSelectPublic: () => void;
  onSelectPrivate: () => void;
  onSelectZip: () => void;
}

export default function RepoSourceTabs({
  repositorySourceMode,
  onSelectPublic,
  onSelectPrivate,
  onSelectZip,
}: RepoSourceTabsProps) {
  const sourceOptionStyle = (active: boolean, accent = "#3b82f6"): React.CSSProperties => ({
    padding: "16px",
    borderRadius: 12,
    border: active ? `2px solid ${accent}` : "1px solid #dbe3ef",
    background: active ? "#eff6ff" : "#ffffff",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
    minHeight: 104,
  });

  const sourceTitleStyle = (active: boolean, color = "#1d4ed8"): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 800,
    color: active ? color : "#0f172a",
    fontSize: 15,
  });

  return (
    <div className="source-option-tabs" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 24 }}>
      <button
        type="button"
        className={`source-option-tab ${repositorySourceMode === "public" ? "source-option-tab--active" : ""}`}
        onClick={onSelectPublic}
        style={sourceOptionStyle(repositorySourceMode === "public")}
      >
        <div style={sourceTitleStyle(repositorySourceMode === "public")}>
          <span>🔗</span>
          Public GitHub Repository
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          Paste a repository URL and continue without a token.
        </div>
      </button>

      <button
        type="button"
        className={`source-option-tab ${repositorySourceMode === "private" ? "source-option-tab--active" : ""}`}
        onClick={onSelectPrivate}
        style={sourceOptionStyle(repositorySourceMode === "private")}
      >
        <div style={sourceTitleStyle(repositorySourceMode === "private")}>
          <span>🔒</span>
          Private GitHub Repository
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          Use a GitHub PAT only when private access is required.
        </div>
      </button>

      <button
        type="button"
        className={`source-option-tab ${repositorySourceMode === "zip" ? "source-option-tab--active" : ""}`}
        onClick={onSelectZip}
        style={sourceOptionStyle(repositorySourceMode === "zip", "#f59e0b")}
      >
        <div style={sourceTitleStyle(repositorySourceMode === "zip", "#b45309")}>
          <span>📦</span>
          Upload Local ZIP
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          Drop or browse for a local .zip project.
        </div>
      </button>
    </div>
  );
}
