interface RepositorySummaryProps {
  repoName: string;
  buildTool?: string | null;
  javaVersion?: string | null;
}

export default function RepositorySummary({ repoName, buildTool, javaVersion }: RepositorySummaryProps) {
  return (
    <div className="discovery-summary-list">
      <div className="inner-card-hover discovery-inner-card discovery-summary-card">
        <span className="discovery-summary-icon">📊</span>
        <div>
          <div className="discovery-summary-title">Repository Analysis</div>
          <div className="discovery-summary-description">Scanning {repoName} for Java components</div>
        </div>
      </div>
      <div className="inner-card-hover discovery-inner-card discovery-summary-card">
        <span className="discovery-summary-icon">🔧</span>
        <div>
          <div className="discovery-summary-title">Build Tool: {buildTool || "Detecting..."}</div>
          <div className="discovery-summary-description">Identified build system for dependency management</div>
        </div>
      </div>
      <div className="inner-card-hover discovery-inner-card discovery-summary-card">
        <span className="discovery-summary-icon">☕</span>
        <div>
          <div className="discovery-summary-title">Java Version: {javaVersion || "Detecting..."}</div>
          <div className="discovery-summary-description">Current Java version detected in the project</div>
        </div>
      </div>
    </div>
  );
}
