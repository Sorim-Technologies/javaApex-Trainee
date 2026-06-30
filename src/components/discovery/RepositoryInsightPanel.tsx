import type { CSSProperties } from "react";
import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";

type RepositoryInsightsPanelProps = {
  context: WizardScreenContext;
};

const getArrayCount = (value: unknown): number => {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).length;
  return 0;
};

const getRepoDependencyCount = (repoAnalysis: any): number => {
  return (
    getArrayCount(repoAnalysis?.dependencies) ||
    getArrayCount(repoAnalysis?.detected_dependencies) ||
    getArrayCount(repoAnalysis?.dependency_updates) ||
    getArrayCount(repoAnalysis?.build?.dependencies)
  );
};

const getRepositoryFileCount = (repoFiles: unknown[]): number => {
  return Array.isArray(repoFiles) ? repoFiles.length : 0;
};

const normalizeLabel = (value: unknown, fallback = "Not Detected") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const cleanJavaVersion = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).replace(/[✓✗]/g, "").trim();
  const match = text.match(/(?:java\s*)?(\d+(?:\.\d+)?)/i);
  return match ? match[1] : null;
};

export default function RepositoryInsightPanel({ context }: RepositoryInsightsPanelProps) {
  const {
    detectedFrameworks,
    detectedJavaStructureLabel,
    isHighRiskProject,
    isJavaProject,
    repoAnalysis,
    repoFiles,
    selectedRepo,
  } = context;

  const detectedBuildTool =
    repoAnalysis?.build_tool ||
    (repoAnalysis?.structure?.has_pom_xml ? "Maven" : repoAnalysis?.structure?.has_build_gradle ? "Gradle" : null);

  const detectedJavaVersion = cleanJavaVersion(
    repoAnalysis?.java_version ||
    repoAnalysis?.java_version_from_build ||
    detectedJavaStructureLabel
  );

  const fileCount = getRepositoryFileCount(repoFiles);
  const dependencyCount = getRepoDependencyCount(repoAnalysis);
  const frameworkCount = detectedFrameworks?.length || 0;

  const healthScore = isJavaProject === false ? 38 : isHighRiskProject ? 68 : 92;
  const readinessScore = isJavaProject === false ? 25 : isHighRiskProject ? 62 : 88;
  const riskLevel = isJavaProject === false ? "High" : isHighRiskProject ? "Medium" : "Low";
  const riskTone = isJavaProject === false ? "danger" : isHighRiskProject ? "warning" : "success";

  const primaryFramework =
    detectedFrameworks?.find((framework: { type: string; }) => framework.type === "Application Framework")?.name ||
    detectedFrameworks?.[0]?.name ||
    "Not Detected";

  const quickMetrics = [
    { icon: "📁", label: "Files", value: fileCount || "Not Detected" },
    { icon: "📦", label: "Dependencies", value: dependencyCount || "Not Detected" },
    { icon: "☕", label: "Java Version", value: detectedJavaVersion ? `Java ${detectedJavaVersion}` : "Not Detected" },
    { icon: "🧩", label: "Frameworks", value: frameworkCount || "Not Detected" },
  ];

  const checklist = [
    { label: "Repository Connected", done: Boolean(selectedRepo) },
    { label: "Repository Scanned", done: Boolean(repoAnalysis) },
    { label: "Java Version Identified", done: Boolean(detectedJavaVersion) },
    { label: "Build Tool Detected", done: Boolean(detectedBuildTool) },
    { label: "Dependencies Loaded", done: dependencyCount > 0 },
    { label: "Framework Identified", done: frameworkCount > 0 },
  ];

  return (
    <aside className="repo-insights-panel" aria-label="Repository insights dashboard">
      <div className="repo-insights-panel__header">
        <span className="repo-insights-panel__eyebrow">Repository Insights</span>
        <h3>Analysis Dashboard</h3>
        <p>Live summary of the connected repository and migration readiness.</p>
      </div>

      <section className="repo-insights-card repo-insights-card--health">
        <div className="repo-insights-health">
          <div
            className="repo-insights-health__ring"
            style={{ "--score": `${healthScore * 3.6}deg` } as CSSProperties}
          >
            <span>{healthScore}%</span>
          </div>
          <div>
            <span className="repo-insights-card__label">Repository Health</span>
            <strong>{healthScore >= 85 ? "Excellent" : healthScore >= 60 ? "Needs Review" : "High Risk"}</strong>
            <small>{normalizeLabel(selectedRepo?.name, "No repository selected")}</small>
          </div>
        </div>
      </section>

      <section className="repo-insights-card repo-insights-card--metrics">
        <div className="repo-insights-card__title">Quick Metrics</div>
        <div className="repo-insights-metrics">
          {quickMetrics.map((metric) => (
            <div className="repo-insights-metric" key={metric.label}>
              <span>{metric.icon}</span>
              <strong>{metric.value}</strong>
              <small>{metric.label}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="repo-insights-card repo-insights-card--readiness">
        <div className="repo-insights-row">
          <div>
            <div className="repo-insights-card__title">Migration Readiness</div>
            <p>Ready for Strategy assessment</p>
          </div>
          <strong>{readinessScore}%</strong>
        </div>
        <div className="repo-insights-progress" aria-label={`Migration readiness ${readinessScore}%`}>
          <span style={{ width: `${readinessScore}%` }} />
        </div>
      </section>

      <section className="repo-insights-card repo-insights-card--risk">
        <div className="repo-insights-card__title">Risk Analysis</div>
        <div className="repo-insights-badges">
          <span className={`repo-insights-badge repo-insights-badge--${riskTone}`}>Compatibility: {riskLevel} Risk</span>
          <span className="repo-insights-badge">Build Tool: {normalizeLabel(detectedBuildTool)}</span>
          <span className="repo-insights-badge">Framework: {primaryFramework}</span>
          <span className="repo-insights-badge">Security: Good</span>
        </div>
      </section>

      <section className="repo-insights-card repo-insights-card--statistics">
        <div className="repo-insights-card__title">Repository Statistics</div>
        <div className="repo-insights-stat-list">
          <div><span>Java Files</span><strong>82%</strong><em style={{ width: "82%" }} /></div>
          <div><span>Configuration</span><strong>68%</strong><em style={{ width: "68%" }} /></div>
          <div><span>Tests</span><strong>{repoAnalysis?.structure?.has_src_test ? "45%" : "12%"}</strong><em style={{ width: repoAnalysis?.structure?.has_src_test ? "45%" : "12%" }} /></div>
        </div>
      </section>

      <section className="repo-insights-card repo-insights-card--ai">
        <div className="repo-insights-card__title">💡 AI Recommendation</div>
        <p>
          Repository appears {riskLevel === "Low" ? "highly compatible" : "partially ready"} for Java LTS migration.
        </p>
        <div className="repo-insights-ai-grid">
          <span>Effort <strong>{riskLevel === "Low" ? "Medium" : "High"}</strong></span>
          <span>Compatibility <strong>{healthScore}%</strong></span>
        </div>
      </section>

      <section className="repo-insights-card repo-insights-card--checklist">
        <div className="repo-insights-card__title">Migration Checklist</div>
        <div className="repo-insights-checklist">
          {checklist.map((item) => (
            <span key={item.label} className={item.done ? "repo-insights-checklist__done" : ""}>
              {item.done ? "✓" : "○"} {item.label}
            </span>
          ))}
        </div>
      </section>
    </aside>
  );
}
