import type { CSSProperties } from "react";
import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";

const LTS_VERSIONS = new Set(["8", "11", "17", "21", "25"]);

const normalizeVersion = (value: unknown): string => {
  if (value === undefined || value === null) return "";
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

const isUnknown = (value: unknown) => !value || String(value).toLowerCase() === "unknown";

export default function StrategyWizardStep({ context }: { context: WizardScreenContext }) {
  const {
    availableTargetVersions,
    buildTargetBranchName,
    buildTargetRepoUrl,
    getDependencyStatusLabel,
    isDetectedDependencyStatus,
    MIGRATION_STEPS,
    migrationApproach,
    migrationApproachOptions,
    rankedJavaRecommendations,
    repoAnalysis,
    riskLevel,
    selectedRepo,
    selectedSourceVersion,
    selectedTargetVersion,
    setMigrationApproach,
    setSelectedSourceVersion,
    setSelectedTargetVersion,
    setStep,
    setTargetRepoName,
    setUserSelectedVersion,
    styles,
    targetRepoName,
    targetRepoTimestamp,
    userSelectedVersion,
    versionRecommendationError,
    versionRecommendationLoading,
  } = context;

  const dependencies = repoAnalysis?.dependencies || [];
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
  const dependencyCount = dependencies.length;
  const healthScore = riskLabel === "Low" ? 92 : riskLabel === "Medium" ? 78 : 62;
  const readinessScore = Math.min(
    96,
    Math.max(55, healthScore - (isTargetLts ? 0 : 8) + (hasTests ? 4 : -5) + (dependencyCount > 0 ? 2 : -2)),
  );

  const sourceVersionText = userSelectedVersion
    ? `Java ${selectedSourceVersion} (manually selected)`
    : !isUnknown(repoAnalysis?.java_version)
      ? `Java ${repoAnalysis?.java_version} (detected)`
      : "Source Java version not detected";

  const sourceHelpText = userSelectedVersion
    ? "Source version manually selected in discovery step"
    : !isUnknown(repoAnalysis?.java_version)
      ? "Java version detected from build configuration"
      : "No Java version found - please select a source version below";

  return (
    <div style={styles.card} className="strategy-dashboard-shell">
      <div style={styles.stepHeader} className="strategy-dashboard-header">
        <span style={styles.stepIcon}>📋</span>
        <div>
          <h2 style={styles.title}>Assessment & Migration Strategy</h2>
          <p style={styles.subtitle}>{MIGRATION_STEPS[2].summary}</p>
        </div>
      </div>

      <div className="strategy-dashboard">
        <section className="strategy-card strategy-assessment-card">
          <div className="strategy-section-heading">📊 Application Assessment</div>
          <div
            style={{
              ...styles.riskBadge,
              backgroundColor: riskLevel === "low" ? "#dcfce7" : riskLevel === "medium" ? "#fef3c7" : "#fee2e2",
              color: riskLevel === "low" ? "#166534" : riskLevel === "medium" ? "#92400e" : "#991b1b",
            }}
          >
            Risk Level: {riskLabel.toUpperCase()}
          </div>
          <div className="strategy-assessment-grid">
            <div className="strategy-metric-card"><span>Build Tool</span><strong>{repoAnalysis?.build_tool || "Not Detected"}</strong></div>
            <div className="strategy-metric-card"><span>Java Version</span><strong>{!isUnknown(repoAnalysis?.java_version) ? repoAnalysis?.java_version : "Not Detected"}</strong></div>
            <div className="strategy-metric-card"><span>Has Tests</span><strong>{hasTests ? "Yes" : "No"}</strong></div>
            <div className="strategy-metric-card"><span>Dependencies</span><strong>{dependencyCount} found</strong></div>
          </div>
        </section>

        <section className="strategy-card strategy-health-card">
          <div
            className="strategy-insights__gauge"
            style={{ "--score": `${readinessScore}%` } as CSSProperties}
            aria-label={`Strategy health score ${readinessScore}%`}
          >
            <span>{readinessScore}%</span>
          </div>
          <div>
            <h3>Strategy Health Score</h3>
            <strong>{readinessScore >= 85 ? "Ready for Planning" : readinessScore >= 70 ? "Needs Review" : "Needs Attention"}</strong>
            <p>Smart analysis of migration readiness and target planning.</p>
          </div>
        </section>

        <div className="strategy-main-grid">
          <div className="strategy-left-column">
            {selectedRepo && repoAnalysis && dependencies.length > 0 && (
              <section className="strategy-card">
                <div className="strategy-section-heading">📦 Detected Dependencies ({dependencies.length})</div>
                <p className="strategy-card-subtitle">These are the dependencies detected in your project.</p>
                <div className="strategy-dependency-list">
                  {dependencies.map((dep, idx) => (
                    <div key={idx} className="strategy-dependency-row">
                      <div>
                        <strong>{dep.group_id}:{dep.artifact_id}</strong>
                        <span className="strategy-purple-line" />
                      </div>
                      <span className="strategy-dependency-version">
                        {dep.current_version}
                      </span>
                      <span className={`strategy-status-pill ${isDetectedDependencyStatus(dep.status) ? "strategy-status-pill--success" : "strategy-status-pill--muted"}`}>
                        {isDetectedDependencyStatus(dep.status) && "✓ "}{getDependencyStatusLabel(dep.status)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="strategy-scroll-note">Scroll to view all {dependencies.length} dependencies</div>
              </section>
            )}

            <section className="strategy-card strategy-approach-card">
              <div className="strategy-section-heading">🎯 Migration Approach</div>
              <div className="strategy-approach-options">
                {migrationApproachOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    className={`strategy-approach-option${migrationApproach === opt.value ? " strategy-approach-option--selected" : ""}`}
                    onClick={() => setMigrationApproach(opt.value)}
                    style={{ "--accent": opt.color } as CSSProperties}
                  >
                    <span>{opt.icon}</span>
                    <div>
                      <strong>{opt.label}</strong>
                      <p>{opt.desc}</p>
                    </div>
                    <em>{migrationApproach === opt.value ? "✓" : ""}</em>
                  </button>
                ))}
              </div>

              <div className="strategy-version-grid">
                <div>
                  <label style={styles.label}>Source Java Version</label>
                  <div className="strategy-readonly-input">{sourceVersionText}</div>
                  <p style={styles.helpText}>{sourceHelpText}</p>
                  {!userSelectedVersion && isUnknown(repoAnalysis?.java_version || repoAnalysis?.java_version_from_build) && (
                    <select
                      value={selectedSourceVersion}
                      onChange={(e) => {
                        setSelectedSourceVersion(e.target.value);
                        setUserSelectedVersion(e.target.value);
                      }}
                      className="strategy-select"
                    >
                      <option value="7">Java 7 (Legacy)</option>
                      <option value="8">Java 8 (LTS)</option>
                      <option value="11">Java 11 (LTS)</option>
                      <option value="17">Java 17 (LTS)</option>
                      <option value="21">Java 21 (LTS)</option>
                    </select>
                  )}
                </div>

                <div>
                  <label style={styles.label}>Target Java Version</label>
                  {versionRecommendationLoading && (
                    <div style={{ ...styles.infoBox, marginBottom: 12 }}>
                      Fetching recommendations for target Java versions based on your project analysis...
                    </div>
                  )}
                  {!versionRecommendationLoading && versionRecommendationError && (
                    <div style={{ ...styles.warningBox, marginBottom: 12, color: "#92400e", fontSize: 13 }}>
                      Remote recommendation unavailable ({versionRecommendationError}). Showing the frontend compatibility ranking instead.
                    </div>
                  )}
                  <select className="strategy-select" value={selectedTargetVersion} onChange={(e) => setSelectedTargetVersion(e.target.value)}>
                    <option value="" disabled>Select Java Version</option>
                    {availableTargetVersions.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                  <p style={styles.helpText}>Choose a ranked recommendation below or manually select any newer supported version.</p>
                </div>
              </div>
            </section>

            {!versionRecommendationLoading && rankedJavaRecommendations.length > 0 && (
              <section className="java-recommendations" aria-labelledby="java-recommendations-title">
                <div className="java-recommendations__header">
                  <div>
                    <div className="java-recommendations__eyebrow">Migration compatibility analysis</div>
                    <h3 id="java-recommendations-title">Ranked target Java versions</h3>
                    <p>Compact ranking based on source version, build setup, dependencies, LTS support, security, performance, and enterprise adoption.</p>
                  </div>
                  <div className="java-recommendations__count">{rankedJavaRecommendations.length} options analyzed</div>
                </div>

                <div className="java-recommendations__list">
                  {rankedJavaRecommendations.map((recommendation, index) => {
                    const isSelected = selectedTargetVersion === recommendation.javaVersion;
                    const cardToneClass = recommendation.isLts ? " java-recommendation-card--lts" : " java-recommendation-card--non-lts";
                    return (
                      <article key={recommendation.javaVersion} className={`inner-card-hover strategy-inner-card java-recommendation-card${cardToneClass}${isSelected ? " java-recommendation-card--selected" : ""}`}>
                        <div className="java-recommendation-card__top">
                          <div className="java-recommendation-card__rank">#{index + 1}</div>
                          <div className="java-recommendation-card__title">
                            <span>Java {recommendation.javaVersion}</span>
                            {recommendation.isLts && <span className="java-recommendation-card__lts-badge">LTS</span>}
                            <span className={`java-recommendation-card__level java-recommendation-card__level--${recommendation.recommendationLevel.toLowerCase().replaceAll(" ", "-")}`}>
                              {recommendation.recommendationLevel}
                            </span>
                          </div>
                          <button type="button" className={`java-recommendation-card__select${isSelected ? " java-recommendation-card__select--selected" : ""}`} onClick={() => setSelectedTargetVersion(recommendation.javaVersion)}>
                            {isSelected ? "Selected" : "Select Version"}
                          </button>
                        </div>
                        <p className="java-recommendation-card__description">{recommendation.description}</p>
                        <ul className="java-recommendation-card__benefits">
                          {recommendation.keyBenefits.slice(0, 2).map((benefit) => <li key={benefit}>{benefit}</li>)}
                        </ul>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="strategy-card strategy-target-card">
              <label style={styles.label}>{migrationApproach === "branch" ? "Target Branch Name" : "Target Repository Name"}</label>
              <input
                type="text"
                className="strategy-target-input"
                value={targetRepoName}
                onChange={(e) => setTargetRepoName(e.target.value)}
                placeholder={
                  migrationApproach === "branch"
                    ? buildTargetBranchName(selectedRepo?.name || "repo", targetRepoTimestamp)
                    : buildTargetRepoUrl(selectedRepo?.name || "repo", targetRepoTimestamp)
                }
              />
              <p style={styles.helpText}>
                Format: <code style={{ backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
                  {migrationApproach === "branch"
                    ? <>migration/{'{source-repo}'}-Migrated{'{timestamp}'}</>
                    : <>https://github.com/Pavithra-Sorim/{'{source-repo}'}-Migrated{'{timestamp}'}</>}
                </code> (auto-generated, editable)
              </p>
            </section>
          </div>

          <div className="strategy-right-column">
            <section className="strategy-card">
              <div className="strategy-section-heading">Java Upgrade Summary</div>
              <div className="strategy-insights__summary-grid">
                <div><span>Source</span><strong>{sourceVersion ? `Java ${sourceVersion}` : "Unknown"}</strong></div>
                <div><span>Target</span><strong>{targetVersion ? `Java ${targetVersion}` : "Pending"}</strong></div>
                <div><span>Version Gap</span><strong>{targetVersion ? `${versionGap} versions` : "--"}</strong></div>
                <div><span>LTS Status</span><strong>{isTargetLts ? "Yes" : "No"}</strong></div>
              </div>
            </section>

            <section className="strategy-card">
              <div className="strategy-section-heading">Risk Analysis</div>
              <div className="strategy-insights__badge-grid">
                <span className={`strategy-insights__badge ${getRiskClass(riskLevel)}`}>Compatibility: {riskLabel}</span>
                <span className={`strategy-insights__badge ${dependencyCount > 20 ? "strategy-insights__badge--warning" : "strategy-insights__badge--success"}`}>Dependency: {dependencyCount > 20 ? "Medium" : "Low"}</span>
                <span className="strategy-insights__badge strategy-insights__badge--success">Build {repoAnalysis?.build_tool ? "Ready" : "Review"}</span>
                <span className={`strategy-insights__badge ${hasTests ? "strategy-insights__badge--success" : "strategy-insights__badge--warning"}`}>Testing {hasTests ? "Ready" : "Review"}</span>
              </div>
            </section>

            <section className="strategy-card">
              <div className="strategy-section-heading">Effort Estimate</div>
              <div className="strategy-insights__effort-row"><strong>{effort.label}</strong><span>{effort.value}% planning confidence</span></div>
              <div className="strategy-insights__meter"><span style={{ width: `${effort.value}%` }} /></div>
            </section>

            <section className="strategy-card">
              <div className="strategy-section-heading">Migration Checklist</div>
              <ul className="strategy-insights__checklist strategy-checklist-grid">
                <li>Confirm source Java version</li>
                <li>Select LTS target version</li>
                <li>Review dependency compatibility</li>
                <li>Confirm migration approach</li>
                <li>Continue to Migration step</li>
              </ul>
            </section>

            <section className="strategy-card">
              <div className="strategy-section-heading">Recommended Actions</div>
              <ul className="strategy-insights__checklist">
                <li>Confirm source Java version</li>
                <li>Select LTS target version</li>
                <li>Review dependency compatibility</li>
                <li>Confirm migration approach</li>
                <li>Continue to Migration step</li>
              </ul>
            </section>

            <section className="strategy-insights__ai-card strategy-card">
              <strong>💡 AI Recommendation</strong>
              <p>
                {targetVersion
                  ? `Java ${targetVersion}${isTargetLts ? " LTS" : ""} is ${isTargetLts ? "suitable" : "available"} for this project based on build tool, dependencies, and framework compatibility.`
                  : "Select a target Java version to generate migration planning guidance."}
              </p>
              {targetRepoName && <span>Target: {targetRepoName}</span>}
              {selectedRecommendation?.recommendationLevel && <span>{selectedRecommendation.recommendationLevel}</span>}
            </section>
          </div>
        </div>

        <div className="strategy-action-row">
          <button style={styles.secondaryBtn} onClick={() => setStep(2)}>← Back</button>
          <button style={styles.primaryBtn} onClick={() => setStep(4)}>Continue to Migration →</button>
        </div>
      </div>
    </div>
  );
}
