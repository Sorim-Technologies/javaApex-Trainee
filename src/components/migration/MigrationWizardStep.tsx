import type { CSSProperties } from "react";
import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";
import "./Migration.css";

const LTS_VERSIONS = new Set(["8", "11", "17", "21", "25"]);

const normalizeVersion = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[^0-9]/g, "");
};

const getVersionGap = (source?: string | number | null, target?: string | number | null) => {
  const sourceNumber = Number(normalizeVersion(source));
  const targetNumber = Number(normalizeVersion(target));
  if (!sourceNumber || !targetNumber) return "Not available";
  const gap = targetNumber - sourceNumber;
  if (gap <= 0) return "No major upgrade";
  return `${gap} major version${gap === 1 ? "" : "s"}`;
};

export default function MigrationWizardStep({ context }: { context: WizardScreenContext }) {
  const {
    codeChanges,
    conversionTypes,
    fixBusinessLogic,
    handleStartMigration,
    loading,
    MIGRATION_STEPS,
    migrationPreview,
    migrationPreviewError,
    migrationPreviewLoading,
    plannedCodeRefactoringTooltip,
    repoAnalysis,
    runFossa,
    runSonar,
    runTests,
    selectedConversions,
    selectedDiffFile,
    selectedSourceVersion,
    selectedTargetVersion,
    setFixBusinessLogic,
    setRunFossa,
    setRunSonar,
    setRunTests,
    setSelectedConversions,
    setSelectedDiffFile,
    setStep,
    styles,
  } = context;

  const apiEndpointCount = repoAnalysis?.api_endpoints?.length ?? 0;
  const dependencyCount = repoAnalysis?.dependencies?.length ?? 0;
  const selectedConversion = conversionTypes.find((item) => item.id === selectedConversions[0]);
  const filesToModify = migrationPreview?.summary?.files_to_modify ?? codeChanges.length ?? 0;
  const plannedChanges = migrationPreview?.summary?.total_changes ?? 0;
  const previewDiffs = migrationPreview?.file_diffs?.length ?? codeChanges.length ?? 0;
  const selectedQualityChecks = [runTests, runSonar, runFossa, fixBusinessLogic].filter(Boolean).length;
  const targetIsLts = LTS_VERSIONS.has(normalizeVersion(selectedTargetVersion));
  const readinessScore = Math.min(
    96,
    58 +
      (selectedTargetVersion ? 12 : 0) +
      (selectedConversions.length ? 10 : 0) +
      (runTests ? 6 : 0) +
      (fixBusinessLogic ? 5 : 0) +
      (migrationPreview ? 5 : 0),
  );
  const effortLevel = dependencyCount > 18 || apiEndpointCount > 12 ? "High" : dependencyCount > 8 || apiEndpointCount > 4 ? "Medium" : "Low";

  const checks = [
    { label: "Target Java selected", done: Boolean(selectedTargetVersion) },
    { label: "Conversion type selected", done: selectedConversions.length > 0 },
    { label: "Preview generated", done: Boolean(migrationPreview) && !migrationPreviewLoading },
    { label: "Test suite enabled", done: runTests },
    { label: "Business logic review enabled", done: fixBusinessLogic },
  ];

  const modernizationCards = [
    {
      icon: "☕",
      title: "Java Version Upgrade",
      desc: `From Java ${selectedSourceVersion || "Not Detected"} to Java ${selectedTargetVersion || "Select Java Version"}`,
      color: "#2563eb",
    },
    {
      icon: "🔧",
      title: "Code Refactoring",
      desc:
        apiEndpointCount > 0
          ? `Modernize code patterns across ${apiEndpointCount} detected API endpoint${apiEndpointCount === 1 ? "" : "s"}`
          : "Modernize code patterns across detected API categories",
      color: "#059669",
      detail: apiEndpointCount ? `API endpoints: ${apiEndpointCount}` : undefined,
      tooltipContent: plannedCodeRefactoringTooltip,
    },
    { icon: "📦", title: "Dependencies", desc: "Update and ensure compatibility", color: "#7c3aed" },
    { icon: "🧠", title: "Business Logic", desc: "Improve performance and reliability", color: "#dc2626" },
  ];

  const migrationOptions = [
    {
      key: "runTests",
      checked: runTests,
      onChange: setRunTests,
      title: "Run Test Suite",
      desc: "Execute automated tests after migration",
      tooltip: "Runs unit and integration tests after migration to verify the migrated project.",
      icon: "🧪",
      color: "#16a34a",
      recommended: true,
    },
    {
      key: "runSonar",
      checked: runSonar,
      onChange: (checked: boolean) => {
        setRunSonar(checked);
        if (checked) setRunFossa(false);
      },
      title: "SonarQube Analysis",
      desc: "Run code quality and security analysis",
      tooltip: "Performs code quality, maintainability, vulnerability, and security checks.",
      icon: "🔍",
      color: "#2563eb",
      recommended: false,
    },
    {
      key: "runFossa",
      checked: runFossa,
      onChange: (checked: boolean) => {
        setRunFossa(checked);
        if (checked) setRunSonar(false);
      },
      title: "FOSSA License & Dependency Scan",
      desc: "Run open source dependency and license compliance analysis",
      tooltip: "Scans dependencies for licenses, vulnerabilities, and policy risks.",
      icon: "📜",
      color: "#f97316",
      recommended: false,
    },
    {
      key: "fixBusinessLogic",
      checked: fixBusinessLogic,
      onChange: setFixBusinessLogic,
      title: "Fix Business Logic Issues",
      desc: "Automatically improve code quality and patterns",
      tooltip: "Applies safe refactoring patterns, null-safety improvements, and modernization fixes.",
      icon: "🛠️",
      color: "#7c3aed",
      recommended: true,
    },
  ];

  const projectSummary = [
    { icon: "🔧", label: "Build Tool", value: repoAnalysis?.build_tool || "Not Detected" },
    { icon: "🧬", label: "Test Framework", value: repoAnalysis?.has_tests ? "Detected" : "Not Detected" },
    { icon: "</>", label: "Project Type", value: repoAnalysis?.frameworks?.[0]?.name || repoAnalysis?.frameworks?.[0] || "Not Detected" },
    { icon: "📄", label: "Code Size", value: repoAnalysis?.files_count ? `${repoAnalysis.files_count} files` : "Not Detected" },
  ];

  return (
    <div style={styles.card} className="migration-dashboard-shell">
      <div style={styles.stepHeader} className="migration-dashboard-header">
        <span style={styles.stepIcon}>⚡</span>
        <div>
          <h2 style={styles.title}>Build Modernization & Migration</h2>
          <p style={styles.subtitle}>{MIGRATION_STEPS[3].summary}</p>
        </div>
        <span className={`migration-ready-chip ${loading ? "migration-ready-chip--running" : ""}`}>{loading ? "Running" : "Ready"}</span>
      </div>

      <div className="migration-dashboard-grid">
        <main className="migration-left-column">
          <section className="migration-card migration-config-card">
            <div className="migration-section-heading">⚙️ Migration Configuration</div>
            <div className="migration-sub-heading">✨ What we’ll modernize</div>
            <div className="migration-modernize-grid">
              {modernizationCards.map((item) => (
                <article key={item.title} className="migration-modernize-card" style={{ "--accent": item.color } as CSSProperties}>
                  <div className="migration-card-icon">{item.icon}</div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                    {item.detail && <span className="migration-detail-chip">{item.detail}</span>}
                  </div>
                  {item.tooltipContent && <div className="migration-card-tooltip">{item.tooltipContent}</div>}
                  <span className="migration-modernize-line" />
                </article>
              ))}
            </div>
          </section>

          <section className="migration-stat-grid" aria-label="Migration quick statistics">
            <div className="migration-stat-card"><span>📄</span><strong>{filesToModify}</strong><p>Files to modify</p></div>
            <div className="migration-stat-card"><span>✅</span><strong>{plannedChanges}</strong><p>Planned changes</p></div>
            <div className="migration-stat-card"><span>👁️</span><strong>{previewDiffs}</strong><p>Preview diffs</p></div>
            <div className="migration-stat-card"><span>🧩</span><strong>{dependencyCount}</strong><p>Dependencies</p></div>
            <div className="migration-stat-card"><span>🛡️</span><strong>{selectedQualityChecks}/4</strong><p>Quality checks</p></div>
          </section>

          <section className="migration-card">
            <div className="migration-section-heading">Preview code changes</div>
            {migrationPreviewLoading && <p className="migration-muted">Analyzing repository and building migration preview...</p>}
            {!migrationPreviewLoading && migrationPreviewError && <p className="migration-error">{migrationPreviewError}</p>}
            {!migrationPreviewLoading && !migrationPreviewError && migrationPreview && codeChanges.length > 0 && (
              <div className="migration-diff-list">
                {codeChanges.map((change, idx) => (
                  <div key={`${change.filePath}-${idx}`} className="migration-diff-item">
                    <button
                      type="button"
                      onClick={() => setSelectedDiffFile(selectedDiffFile === change.filePath ? null : change.filePath)}
                      className="migration-diff-trigger"
                    >
                      <span>{selectedDiffFile === change.filePath ? "▼" : "▶"}</span>
                      <strong>{change.filePath}</strong>
                      <em>+{change.additions} / -{change.deletions}</em>
                    </button>
                    {selectedDiffFile === change.filePath && (
                      <div className="migration-diff-code">
                        {change.diffLines.map((line, lineIdx) => (
                          <div key={lineIdx} className={`migration-diff-line migration-diff-line--${line.type}`}>
                            <span>{line.lineNumber}</span>
                            <b>{line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}</b>
                            <code>{line.content}</code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!migrationPreviewLoading && !migrationPreviewError && (!migrationPreview || codeChanges.length === 0) && (
              <p className="migration-muted">No file-level diff preview is available for this repository yet.</p>
            )}
          </section>

          <section className="migration-card">
            <label className="migration-field-label">Conversion Types</label>
            <select
              className="migration-select"
              value={selectedConversions[0] || ""}
              onChange={(event) => setSelectedConversions(event.target.value ? [event.target.value] : [])}
            >
              <option value="">-- Select Conversion Type --</option>
              {conversionTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>{ct.name} - {ct.description}</option>
              ))}
            </select>
            {selectedConversions.length > 0 && (
              <div className="migration-selected-conversion">
                <span>✓ {selectedConversion?.name} selected</span>
                <button type="button" onClick={() => setSelectedConversions([])}>×</button>
              </div>
            )}
          </section>

          <section className="migration-card">
            <div className="migration-section-heading">Migration Options</div>
            <div className="migration-option-grid">
              {migrationOptions.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  className={`migration-option-card ${option.checked ? "migration-option-card--selected" : ""}`}
                  style={{ "--accent": option.color } as CSSProperties}
                  onClick={() => option.onChange(!option.checked)}
                >
                  <span className="migration-option-icon">{option.icon}</span>
                  <div>
                    <strong>{option.title}</strong>
                    {option.recommended && <em>Recommended</em>}
                    <p>{option.desc}</p>
                  </div>
                  <span className="migration-option-check">{option.checked ? "✓" : ""}</span>
                  <small>{option.tooltip}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="migration-summary-grid">
            {projectSummary.map((item) => (
              <div key={item.label} className="migration-summary-card">
                <span>{item.icon}</span>
                <div><strong>{item.label}</strong><p>{item.value}</p></div>
              </div>
            ))}
          </section>

          {/* Left-column bottom cards removed — moved to right column for compact layout */}
        </main>

        <aside className="migration-right-column" aria-label="Migration execution insights">
          <section className="migration-card migration-insights-card">
            <div className="migration-section-heading">Migration Execution Insights</div>
            <p className="migration-muted">Live readiness summary for modernization and execution.</p>
            <div className="migration-readiness-card">
              <div className="migration-health-ring" style={{ "--score": readinessScore } as CSSProperties}><span>{readinessScore}%</span></div>
              <div>
                <strong>Execution Readiness</strong>
                <p>{readinessScore >= 85 ? "Ready to start migration" : "Configuration review recommended"}</p>
                <div className="migration-readiness-bar"><span style={{ width: `${readinessScore}%` }} /></div>
              </div>
            </div>
            <div className="migration-insight-metrics">
              <div><strong>{filesToModify}</strong><span>Files affected</span></div>
              <div><strong>{plannedChanges}</strong><span>Planned changes</span></div>
              <div><strong>{dependencyCount}</strong><span>Dependencies</span></div>
              <div><strong>{selectedQualityChecks}/4</strong><span>Quality checks</span></div>
            </div>
          </section>

          <section className="migration-card">
            <div className="migration-section-heading">Java Upgrade Plan</div>
            <div className="migration-upgrade-row"><span>Source</span><strong>Java {selectedSourceVersion || "Not Detected"}</strong></div>
            <div className="migration-upgrade-row"><span>Target</span><strong>Java {selectedTargetVersion || "Not Selected"}</strong></div>
            <div className="migration-upgrade-row"><span>Version gap</span><strong>{getVersionGap(selectedSourceVersion, selectedTargetVersion)}</strong></div>
            <div className="migration-badge-row">
              <span className={targetIsLts ? "migration-badge migration-badge--success" : "migration-badge migration-badge--muted"}>{targetIsLts ? "LTS Target" : "Non-LTS Target"}</span>
              <span className="migration-badge migration-badge--info">{effortLevel} Effort</span>
            </div>
          </section>

          <section className="migration-card">
            <div className="migration-section-heading">Selected Modernization</div>
            <div className="migration-option-summary">
              <strong>{selectedConversion?.name || "No conversion selected"}</strong>
              <span>{selectedConversion?.description || "Select a conversion type before execution."}</span>
            </div>
            <div className="migration-quality-list">
              <span className={runTests ? "enabled" : ""}>Tests</span>
              <span className={runSonar ? "enabled" : ""}>SonarQube</span>
              <span className={runFossa ? "enabled" : ""}>FOSSA</span>
              <span className={fixBusinessLogic ? "enabled" : ""}>Logic Fixes</span>
            </div>
          </section>

          <section className="migration-card">
            <div className="migration-section-heading">Risk Snapshot</div>
            <div className="migration-risk-list">
              <div><span>Compatibility</span><strong className="low">Low</strong></div>
              <div><span>Dependencies</span><strong className={dependencyCount > 10 ? "medium" : "low"}>{dependencyCount > 10 ? "Medium" : "Low"}</strong></div>
              <div><span>Testing</span><strong className={runTests ? "low" : "medium"}>{runTests ? "Low" : "Medium"}</strong></div>
              <div><span>Business logic</span><strong className={fixBusinessLogic ? "low" : "medium"}>{fixBusinessLogic ? "Low" : "Medium"}</strong></div>
            </div>
          </section>
          <section className="migration-card migration-compact-card">
            <div className="migration-section-heading">Execution Checklist</div>
            <div className="migration-checklist migration-checklist--compact">
              {checks.map((check) => (
                <div key={check.label} className={check.done ? "done" : "pending"}>
                  <span>{check.done ? "✓" : "○"}</span>{check.label}
                </div>
              ))}
            </div>
          </section>

          <section className="migration-card migration-ai-card migration-compact-card">
            <div className="migration-section-heading">✨ AI Recommendation</div>
            <p className="migration-ai-compact">
              Start migration after confirming the target Java version and enabling tests. The selected plan is suitable for automated modernization with controlled validation. Java {selectedTargetVersion || "target"} is recommended; ensure tests pass before executing migration.
            </p>
          </section>
        </aside>
      </div>

      <div className="migration-action-row">
        <button style={styles.secondaryBtn} onClick={() => setStep(3)}>← Back</button>
        <button style={{ ...styles.primaryBtn, opacity: loading ? 0.5 : 1 }} onClick={handleStartMigration} disabled={loading}>
          {loading ? "Starting..." : "🚀 Start Migration"}
        </button>
      </div>
    </div>
  );
}
