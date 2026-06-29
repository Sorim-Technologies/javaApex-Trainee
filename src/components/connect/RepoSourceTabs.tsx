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
  const publicActive = repositorySourceMode === "public";
  const privateActive = repositorySourceMode === "private";
  const zipActive = repositorySourceMode === "zip";

  return (
    <div className="connect-source-tabs">
      <button
        type="button"
        className={`connect-source-tab ${publicActive ? "connect-source-tab--public-active" : ""}`}
        onClick={onSelectPublic}
      >
        <div className={`connect-source-title ${publicActive ? "connect-source-title--active" : ""}`}>
          Public GitHub Repository
        </div>
        <div className="connect-source-description">
          Paste a repository URL and continue without a token.
        </div>
      </button>

      <button
        type="button"
        className={`connect-source-tab ${privateActive ? "connect-source-tab--private-active" : ""}`}
        onClick={onSelectPrivate}
      >
        <div className={`connect-source-title ${privateActive ? "connect-source-title--active" : ""}`}>
          Private GitHub Repository
        </div>
        <div className="connect-source-description">
          Use a GitHub PAT only when private access is required.
        </div>
      </button>

      <button
        type="button"
        className={`connect-source-tab ${zipActive ? "connect-source-tab--zip-active" : ""}`}
        onClick={onSelectZip}
      >
        <div className={`connect-source-title ${zipActive ? "connect-source-title--zip-active" : ""}`}>
          Upload Local ZIP
        </div>
        <div className="connect-source-description">
          Drop or browse for a local .zip project.
        </div>
      </button>
    </div>
  );
}
