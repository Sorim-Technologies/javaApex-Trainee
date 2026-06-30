import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";
import "./Migration.css";

type Props = {
  context: WizardScreenContext;
};

const isLtsVersion = (version?: string | number | null) => {
  const normalized = String(version ?? "").replace(/[^0-9]/g, "");
  return ["8", "11", "17", "21", "25"].includes(normalized);
};

const getVersionGap = (source?: string | number | null, target?: string | number | null) => {
  const sourceNumber = Number(String(source ?? "").replace(/[^0-9]/g, ""));
  const targetNumber = Number(String(target ?? "").replace(/[^0-9]/g, ""));

  if (!sourceNumber || !targetNumber) return "Not available";

  const gap = targetNumber - sourceNumber;
  if (gap <= 0) return "No major upgrade";
  return `${gap} major version${gap === 1 ? "" : "s"}`;
};

export default function MigrationInsightsPanel({ context }: Props) {
  const {
    codeChanges,
    conversionTypes,
    fixBusinessLogic,
    loading,
    migrationPreview,
    migrationPreviewLoading,
    repoAnalysis,
    runFossa,
    runSonar,
    runTests,
    selectedConversions,
    selectedSourceVersion,
    selectedTargetVersion,
  } = context;

  const apiEndpointCount = repoAnalysis?.api_endpoints?.length ?? 0;
  const dependencyCount = repoAnalysis?.dependencies?.length ?? 0;
  const selectedConversion = conversionTypes.find((item) => item.id === selectedConversions[0]);
  const filesToModify = migrationPreview?.summary?.files_to_modify ?? codeChanges.length;
  const plannedChanges = migrationPreview?.summary?.total_changes ?? 0;
  const targetIsLts = isLtsVersion(selectedTargetVersion);
  const selectedQualityChecks = [runTests, runSonar, runFossa, fixBusinessLogic].filter(Boolean).length;
  const readinessScore = Math.min(
    96,
    58 +
      (selectedTargetVersion ? 12 : 0) +
      (selectedConversions.length ? 10 : 0) +
      (runTests ? 6 : 0) +
      (fixBusinessLogic ? 5 : 0) +
      (migrationPreview ? 5 : 0)
  );
  const effortLevel = dependencyCount > 18 || apiEndpointCount > 12 ? "High" : dependencyCount > 8 || apiEndpointCount > 4 ? "Medium" : "Low";

  const checks = [
    { label: "Target Java selected", done: Boolean(selectedTargetVersion) },
    { label: "Conversion type selected", done: selectedConversions.length > 0 },
    { label: "Preview generated", done: Boolean(migrationPreview) && !migrationPreviewLoading },
    { label: "Test suite enabled", done: runTests },
    { label: "Business logic review enabled", done: fixBusinessLogic },
  ];

  return (
    <aside className="migration-insights-panel" aria-label="Migration analysis insights">
      <div className="migration-insights-panel__header">
        <div>
          <p className="migration-insights-panel__eyebrow">Migration Analysis</p>
          <h3>Migration Execution Insights</h3>
          <span>Live readiness summary for modernization and execution.</span>
        </div>
        <div className={`migration-insights-panel__status ${loading ? "migration-insights-panel__status--running" : ""}`}>
          {loading ? "Running" : "Ready"}
        </div>
      </div>

      <section className="migration-insight-card migration-insight-card--hero">
        <div className="migration-health-ring" style={{ "--score": readinessScore } as React.CSSProperties}>
          <span>{readinessScore}%</span>
        </div>
        <div>
          <h4>Execution Readiness</h4>
          <p>{readinessScore >= 85 ? "Ready to start migration" : "Configuration review recommended"}</p>
          <div className="migration-readiness-bar">
            <span style={{ width: `${readinessScore}%` }} />
          </div>
        </div>
      </section>

      <section className="migration-insight-grid">
        <div className="migration-mini-metric">
          <strong>{filesToModify}</strong>
          <span>Files affected</span>
        </div>
        <div className="migration-mini-metric">
          <strong>{plannedChanges}</strong>
          <span>Planned changes</span>
        </div>
        <div className="migration-mini-metric">
          <strong>{dependencyCount}</strong>
          <span>Dependencies</span>
        </div>
        <div className="migration-mini-metric">
          <strong>{selectedQualityChecks}/4</strong>
          <span>Quality checks</span>
        </div>
      </section>

      <section className="migration-insight-card">
        <div className="migration-insight-card__title">Java Upgrade Plan</div>
        <div className="migration-upgrade-row">
          <span>Source</span>
          <strong>Java {selectedSourceVersion || "Not detected"}</strong>
        </div>
        <div className="migration-upgrade-row">
          <span>Target</span>
          <strong>Java {selectedTargetVersion || "Not selected"}</strong>
        </div>
        <div className="migration-upgrade-row">
          <span>Version gap</span>
          <strong>{getVersionGap(selectedSourceVersion, selectedTargetVersion)}</strong>
        </div>
        <div className="migration-badge-row">
          <span className={targetIsLts ? "migration-badge migration-badge--success" : "migration-badge migration-badge--muted"}>
            {targetIsLts ? "LTS target" : "Non-LTS target"}
          </span>
          <span className="migration-badge migration-badge--info">{effortLevel} effort</span>
        </div>
      </section>

      <section className="migration-insight-card">
        <div className="migration-insight-card__title">Selected Modernization</div>
        <div className="migration-option-summary">
          <div>
            <strong>{selectedConversion?.name || "No conversion selected"}</strong>
            <span>{selectedConversion?.description || "Select a conversion type before execution."}</span>
          </div>
        </div>
        <div className="migration-quality-list">
          <span className={runTests ? "enabled" : ""}>Tests</span>
          <span className={runSonar ? "enabled" : ""}>SonarQube</span>
          <span className={runFossa ? "enabled" : ""}>FOSSA</span>
          <span className={fixBusinessLogic ? "enabled" : ""}>Logic Fixes</span>
        </div>
      </section>

      <section className="migration-insight-card">
        <div className="migration-insight-card__title">Risk Snapshot</div>
        <div className="migration-risk-list">
          <div><span>Compatibility</span><strong className="low">Low</strong></div>
          <div><span>Dependencies</span><strong className={dependencyCount > 10 ? "medium" : "low"}>{dependencyCount > 10 ? "Medium" : "Low"}</strong></div>
          <div><span>Testing</span><strong className={runTests ? "low" : "medium"}>{runTests ? "Low" : "Medium"}</strong></div>
          <div><span>Business logic</span><strong className={fixBusinessLogic ? "low" : "medium"}>{fixBusinessLogic ? "Low" : "Medium"}</strong></div>
        </div>
      </section>

      <section className="migration-insight-card migration-insight-card--ai">
        <div className="migration-insight-card__title">💡 AI Recommendation</div>
        <p>
          Start migration after confirming the target Java version and enabling tests. The selected plan is suitable for automated modernization with controlled validation.
        </p>
      </section>

      <section className="migration-insight-card">
        <div className="migration-insight-card__title">Execution Checklist</div>
        <div className="migration-checklist">
          {checks.map((check) => (
            <div key={check.label} className={check.done ? "done" : "pending"}>
              <span>{check.done ? "✓" : "○"}</span>
              {check.label}
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
