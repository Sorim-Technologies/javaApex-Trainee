import type { CSSProperties } from "react";
import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";

type StrategyInsightsPanelProps = {
  context: WizardScreenContext;
};

const LTS_VERSIONS = new Set(["8", "11", "17", "21", "25"]);

const normalizeVersion = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[^0-9]/g, "");
};

const getRiskLabel = (riskLevel: string | undefined) => {
  const normalized = (riskLevel || "medium").toLowerCase();
  if (normalized.includes("low")) return "Low";
  if (normalized.includes("high")) return "High";
  return "Medium";
};

const getRiskClass = (riskLevel: string | undefined) => {
  const normalized = (riskLevel || "medium").toLowerCase();
  if (normalized.includes("low")) return "strategy-insights__badge--success";
  if (normalized.includes("high")) return "strategy-insights__badge--danger";
  return "strategy-insights__badge--warning";
};

const getEffort = (riskLevel: string | undefined, versionGap: number) => {
  const normalized = (riskLevel || "medium").toLowerCase();
  if (normalized.includes("high") || versionGap >= 10) return { label: "High", value: 78 };
  if (normalized.includes("medium") || versionGap >= 5) return { label: "Medium", value: 58 };
  return { label: "Low", value: 34 };
};

export default function StrategyInsightsPanel({ context }: StrategyInsightsPanelProps) {
  const {
    migrationApproach,
    migrationApproachOptions,
    rankedJavaRecommendations,
    repoAnalysis,
    riskLevel,
    selectedSourceVersion,
    selectedTargetVersion,
    targetRepoName,
    userSelectedVersion,
  } = context;

  const sourceVersion = normalizeVersion(
    userSelectedVersion || selectedSourceVersion || repoAnalysis?.java_version || repoAnalysis?.java_version_from_build,
  );
  const targetVersion = normalizeVersion(selectedTargetVersion);
  const versionGap = sourceVersion && targetVersion ? Math.max(Number(targetVersion) - Number(sourceVersion), 0) : 0;
  const isTargetLts = LTS_VERSIONS.has(targetVersion);
  const selectedRecommendation = rankedJavaRecommendations?.find(
    (recommendation) => normalizeVersion(recommendation.javaVersion) === targetVersion,
  );
  const activeApproach = migrationApproachOptions?.find((option) => option.value === migrationApproach);
  const riskLabel = getRiskLabel(riskLevel);
  const effort = getEffort(riskLevel, versionGap);
  const hasTests = Boolean(repoAnalysis?.has_tests);
  const dependencyCount = repoAnalysis?.dependencies?.length || 0;
  const healthScore = riskLabel === "Low" ? 92 : riskLabel === "Medium" ? 78 : 62;
  const readinessScore = Math.min(
    96,
    Math.max(
      55,
      healthScore - (isTargetLts ? 0 : 8) + (hasTests ? 4 : -5) + (dependencyCount > 0 ? 2 : -2),
    ),
  );

  return (
    <aside className="strategy-insights" aria-label="Migration Strategy Insights">
      <div className="strategy-insights__header">
        <div>
          <span className="strategy-insights__eyebrow">Strategy Analysis</span>
          <h3>Migration Strategy Insights</h3>
          <p>Smart analysis of migration readiness and target planning.</p>
        </div>
      </div>

      <section className="strategy-insights__score-card">
        <div
          className="strategy-insights__gauge"
          style={{ "--score": `${readinessScore}%` } as CSSProperties}
          aria-label={`Strategy health score ${readinessScore}%`}
        >
          <span>{readinessScore}%</span>
        </div>
        <div>
          <strong>Strategy Health Score</strong>
          <p>{readinessScore >= 85 ? "Ready for Planning" : readinessScore >= 70 ? "Needs Review" : "Needs Attention"}</p>
        </div>
      </section>

      <section className="strategy-insights__section">
        <div className="strategy-insights__section-title">Selected Target Java</div>
        <div className="strategy-insights__java-card">
          <div>
            <span className="strategy-insights__muted">Target</span>
            <strong>{targetVersion ? `Java ${targetVersion}` : "Not selected"}</strong>
          </div>
          <span className={`strategy-insights__badge ${isTargetLts ? "strategy-insights__badge--success" : "strategy-insights__badge--muted"}`}>
            {isTargetLts ? "LTS" : "Non-LTS"}
          </span>
        </div>
        <div className="strategy-insights__small-note">
          {selectedRecommendation?.recommendationLevel || (isTargetLts ? "Recommended" : "Alternative")}
        </div>
      </section>

      <section className="strategy-insights__section">
        <div className="strategy-insights__section-title">Migration Approach</div>
        <div className="strategy-insights__approach-card">
          <span>{activeApproach?.icon || "🚀"}</span>
          <div>
            <strong>{activeApproach?.label || "Not selected"}</strong>
            <p>{activeApproach?.desc || "Select how migrated changes should be delivered."}</p>
          </div>
        </div>
      </section>

      <section className="strategy-insights__section">
        <div className="strategy-insights__section-title">Java Upgrade Summary</div>
        <div className="strategy-insights__summary-grid">
          <div><span>Source</span><strong>{sourceVersion ? `Java ${sourceVersion}` : "Unknown"}</strong></div>
          <div><span>Target</span><strong>{targetVersion ? `Java ${targetVersion}` : "Pending"}</strong></div>
          <div><span>Version Gap</span><strong>{targetVersion ? `${versionGap} versions` : "--"}</strong></div>
          <div><span>LTS Status</span><strong>{isTargetLts ? "Yes" : "No"}</strong></div>
        </div>
      </section>

      <section className="strategy-insights__section">
        <div className="strategy-insights__section-title">Risk Analysis</div>
        <div className="strategy-insights__badge-grid">
          <span className={`strategy-insights__badge ${getRiskClass(riskLevel)}`}>Compatibility {riskLabel}</span>
          <span className={`strategy-insights__badge ${dependencyCount > 20 ? "strategy-insights__badge--warning" : "strategy-insights__badge--success"}`}>Dependency {dependencyCount > 20 ? "Medium" : "Low"}</span>
          <span className="strategy-insights__badge strategy-insights__badge--success">Build {repoAnalysis?.build_tool ? "Ready" : "Review"}</span>
          <span className={`strategy-insights__badge ${hasTests ? "strategy-insights__badge--success" : "strategy-insights__badge--warning"}`}>Testing {hasTests ? "Ready" : "Review"}</span>
        </div>
      </section>

      <section className="strategy-insights__section">
        <div className="strategy-insights__section-title">Effort Estimate</div>
        <div className="strategy-insights__effort-row">
          <strong>{effort.label}</strong>
          <span>{effort.value}% planning confidence</span>
        </div>
        <div className="strategy-insights__meter"><span style={{ width: `${effort.value}%` }} /></div>
      </section>

      <section className="strategy-insights__section">
        <div className="strategy-insights__section-title">Recommended Actions</div>
        <ul className="strategy-insights__checklist">
          <li>Confirm source Java version</li>
          <li>Select LTS target version</li>
          <li>Review dependency compatibility</li>
          <li>Confirm migration approach</li>
          <li>Continue to Migration step</li>
        </ul>
      </section>

      <section className="strategy-insights__ai-card">
        <strong>💡 AI Recommendation</strong>
        <p>
          {targetVersion
            ? `Java ${targetVersion}${isTargetLts ? " LTS" : ""} is ${isTargetLts ? "suitable" : "available"} for this project based on build tool, dependencies, and framework compatibility.`
            : "Select a target Java version to generate migration planning guidance."}
        </p>
        {targetRepoName && <span>Target: {targetRepoName}</span>}
      </section>
    </aside>
  );
}
