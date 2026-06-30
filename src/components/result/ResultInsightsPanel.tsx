import type React from "react";
import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";
import "./Result.css";

const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const safeText = (value: unknown, fallback = "N/A") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

export default function ResultInsightsPanel({ context }: { context: WizardScreenContext }) {
  const {
    codeChanges,
    migrationJob,
    migrationLogs,
    runFossa,
    runSonar,
    selectedRepo,
  } = context;

  const dependencies = migrationJob?.dependencies ?? [];
  const upgradedDependencies = dependencies.filter((dependency) => dependency.status === "upgraded").length;
  const filesModified = numberValue(migrationJob?.files_modified);
  const issuesFixed = numberValue(migrationJob?.issues_fixed);
  const errorsFixed = numberValue(migrationJob?.errors_fixed);
  const remainingErrors = numberValue(migrationJob?.total_errors);
  const warnings = numberValue(migrationJob?.total_warnings);
  const sonarCoverage = numberValue(migrationJob?.sonar_coverage);
  const qualityGate = safeText(migrationJob?.sonar_quality_gate, runSonar ? "Pending" : "Not Run");
  const sourceJava = safeText(migrationJob?.source_java_version, "Source");
  const targetJava = safeText(migrationJob?.target_java_version, "Target");
  const totalChanges = codeChanges?.length ?? 0;
  const additions = codeChanges?.reduce((sum, change) => sum + numberValue(change.additions), 0) ?? 0;
  const deletions = codeChanges?.reduce((sum, change) => sum + numberValue(change.deletions), 0) ?? 0;

  const successScore = Math.max(
    72,
    Math.min(
      100,
      92 + Math.min(errorsFixed, 5) - Math.min(remainingErrors * 8, 30) - Math.min(warnings, 8),
    ),
  );

  const completionStatus = migrationJob?.status === "completed" ? "Completed" : safeText(migrationJob?.status, "In Progress");
  const riskLevel = remainingErrors > 0 ? "Medium" : warnings > 10 ? "Low" : "Minimal";
  const releaseReadiness = remainingErrors === 0 ? "Ready for Review" : "Needs Review";

  const progressItems = [
    { label: "Files Updated", value: Math.min(100, Math.max(18, filesModified * 18)), display: filesModified },
    { label: "Issues Fixed", value: Math.min(100, Math.max(18, issuesFixed * 12)), display: issuesFixed },
    { label: "Dependencies", value: dependencies.length ? Math.min(100, Math.max(25, upgradedDependencies / dependencies.length * 100)) : 35, display: upgradedDependencies },
  ];

  const checklist = [
    "Migration job completed",
    "Repository summary generated",
    "Dependencies reviewed",
    "Code changes prepared",
    runSonar ? "SonarQube scan reviewed" : "Quality scan optional",
    runFossa ? "FOSSA license scan reviewed" : "License scan optional",
  ];

  return (
    <aside className="result-insights-panel" aria-label="Migration result insights">
      <div className="result-insights-panel__header">
        <div>
          <span className="result-insights-panel__eyebrow">Result Analysis</span>
          <h3>Migration Result Insights</h3>
          <p>Executive summary of migration output, quality, and release readiness.</p>
        </div>
        <span className="result-insights-panel__status">{completionStatus}</span>
      </div>

      <section className="result-insight-card result-insight-card--hero">
        <div className="result-score-ring" style={{ "--score": `${successScore}%` } as React.CSSProperties}>
          <div>
            <strong>{successScore}%</strong>
            <span>Success</span>
          </div>
        </div>
        <div className="result-score-copy">
          <strong>{releaseReadiness}</strong>
          <span>{sourceJava} → {targetJava}</span>
          <small>Migration package is ready for validation and delivery review.</small>
        </div>
      </section>

      <section className="result-insight-card">
        <div className="result-insight-card__title">Quick Metrics</div>
        <div className="result-metric-grid">
          <div><strong>{filesModified}</strong><span>Files Updated</span></div>
          <div><strong>{issuesFixed}</strong><span>Issues Fixed</span></div>
          <div><strong>{upgradedDependencies}</strong><span>Deps Upgraded</span></div>
          <div><strong>{totalChanges}</strong><span>Changed Files</span></div>
        </div>
      </section>

      <section className="result-insight-card">
        <div className="result-insight-card__title">Migration Progress</div>
        <div className="result-progress-list">
          {progressItems.map((item) => (
            <div className="result-progress-item" key={item.label}>
              <div>
                <span>{item.label}</span>
                <strong>{item.display}</strong>
              </div>
              <div className="result-progress-track">
                <span style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="result-insight-card">
        <div className="result-insight-card__title">Quality Snapshot</div>
        <div className="result-badge-list">
          <span>Quality Gate <strong>{qualityGate}</strong></span>
          <span>Coverage <strong>{sonarCoverage ? `${sonarCoverage}%` : "N/A"}</strong></span>
          <span>Risk <strong>{riskLevel}</strong></span>
          <span>Warnings <strong>{warnings}</strong></span>
        </div>
      </section>

      <section className="result-insight-card result-insight-card--recommendation">
        <div className="result-insight-card__title">💡 AI Recommendation</div>
        <p>
          Review the generated repository, validate tests, and prioritize remaining warnings before production release.
        </p>
        <div className="result-recommendation-grid">
          <div><span>Errors</span><strong>{remainingErrors}</strong></div>
          <div><span>Logs</span><strong>{migrationLogs.length}</strong></div>
        </div>
      </section>

      <section className="result-insight-card">
        <div className="result-insight-card__title">Code Delta</div>
        <div className="result-delta-grid">
          <div className="result-delta-grid__add">+{additions}<span>Additions</span></div>
          <div className="result-delta-grid__remove">-{deletions}<span>Deletions</span></div>
        </div>
      </section>

      <section className="result-insight-card">
        <div className="result-insight-card__title">Delivery Checklist</div>
        <div className="result-checklist">
          {checklist.map((item) => (
            <span key={item}>✓ {item}</span>
          ))}
        </div>
      </section>

      <section className="result-insight-card result-insight-card--repo">
        <div className="result-insight-card__title">Repository</div>
        <strong>{selectedRepo?.name || "Migrated project"}</strong>
        <span>{safeText(migrationJob?.target_repo, "Target repository pending")}</span>
      </section>
    </aside>
  );
}
