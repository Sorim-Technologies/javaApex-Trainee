import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";

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

  // Consolidated Step 3: Strategy (Assessment + Migration Strategy + Planning)
  const renderStrategyStep = () => (
    <div style={styles.card}>
      <div style={styles.stepHeader}>
        <span style={styles.stepIcon}>📋</span>
        <div>
          <h2 style={styles.title}>Assessment & Migration Strategy</h2>
          <p style={styles.subtitle}>{MIGRATION_STEPS[2].summary}</p>
        </div>
      </div>

      {/* Assessment Section */}
      {selectedRepo && repoAnalysis && (
        <>
          <div style={styles.sectionTitle}>📊 Application Assessment</div>
          <div style={{ ...styles.riskBadge, backgroundColor: riskLevel === "low" ? "#dcfce7" : riskLevel === "medium" ? "#fef3c7" : "#fee2e2", color: riskLevel === "low" ? "#166534" : riskLevel === "medium" ? "#92400e" : "#991b1b" }}>
            Risk Level: {riskLevel.toUpperCase()}
          </div>

          <div style={styles.assessmentGrid}>
            <div className="inner-card-hover assessment-inner-card" style={styles.assessmentItem}><div style={styles.assessmentLabel}>Build Tool</div><div style={styles.assessmentValue}>{repoAnalysis.build_tool || "Not Detected"}</div></div>
            <div className="inner-card-hover assessment-inner-card" style={styles.assessmentItem}><div style={styles.assessmentLabel}>Java Version</div><div style={styles.assessmentValue}>{repoAnalysis.java_version || "Unknown"}</div></div>
            <div className="inner-card-hover assessment-inner-card" style={styles.assessmentItem}><div style={styles.assessmentLabel}>Has Tests</div><div style={styles.assessmentValue}>{repoAnalysis.has_tests ? "Yes" : "No"}</div></div>
            <div className="inner-card-hover assessment-inner-card" style={styles.assessmentItem}><div style={styles.assessmentLabel}>Dependencies</div><div style={styles.assessmentValue}>{repoAnalysis.dependencies?.length || 0} found</div></div>
          </div>

          {repoAnalysis.dependencies && repoAnalysis.dependencies.length > 0 && (
            <div
              style={{
                marginTop: 24,
                padding: "28px 32px",
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>📦</span>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>
                  Detected Dependencies ({repoAnalysis.dependencies.length})
                </h3>
              </div>

              <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                These are the dependencies detected in your project.
              </p>

              <div style={{ height: 1, backgroundColor: "#e5e7eb", marginBottom: 14 }} />

              <div
                style={{
                  maxHeight: 235,
                  overflowY: "auto",
                  overflowX: "hidden",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  backgroundColor: "#ffffff",
                  padding: "0 10px",
                  scrollBehavior: "smooth",
                }}
              >
                {repoAnalysis.dependencies.map((dep, idx) => (
                  <div
                    key={idx}
                    className="inner-card-hover dependency-inner-card"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.7fr 0.55fr 0.65fr",
                      alignItems: "center",
                      minHeight: 72,
                      gap: 14,
                      padding: "14px 8px",
                      borderBottom: idx === repoAnalysis.dependencies.length - 1 ? "none" : "1px solid #e5e7eb",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", wordBreak: "break-word" }}>
                        {dep.group_id}:{dep.artifact_id}
                      </div>
                      <div
                        style={{
                          width: 145,
                          maxWidth: "60%",
                          height: 3,
                          marginTop: 14,
                          borderRadius: 999,
                          background: "linear-gradient(90deg, #7c3aed, #a855f7)",
                        }}
                      />
                    </div>

                    <span style={{ fontSize: 14, fontWeight: 700, color: "#475569", textAlign: "center" }}>
                      {dep.current_version}
                    </span>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        minWidth: 118,
                        padding: "8px 14px",
                        borderRadius: 999,
                        backgroundColor: isDetectedDependencyStatus(dep.status) ? "#dcfce7" : "#e5e7eb",
                        color: isDetectedDependencyStatus(dep.status) ? "#166534" : "#6b7280",
                        fontSize: 12,
                        fontWeight: 800,
                        textAlign: "center",
                      }}
                    >
                      {isDetectedDependencyStatus(dep.status) && <span style={{ fontSize: 15 }}>✓</span>}
                      {getDependencyStatusLabel(dep.status)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                Scroll to view all {repoAnalysis.dependencies.length} dependencies
              </div>
            </div>
          )}
        </>
      )}

      {/* Strategy Section */}
      <div style={styles.sectionTitle}>📋 Migration Strategy</div>
      <div style={styles.field}>
        <label style={styles.label}>Migration Approach</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {migrationApproachOptions.map((opt) => (
            <div key={opt.value} style={{ position: "relative" }}>
              <div
                onClick={() => setMigrationApproach(opt.value)}
                style={{
                  padding: 20,
                  borderRadius: 12,
                  border: `2px solid ${migrationApproach === opt.value ? opt.color : "#e2e8f0"}`,
                  backgroundColor: migrationApproach === opt.value ? `${opt.color}08` : "#fff",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: migrationApproach === opt.value ? `0 4px 12px ${opt.color}20` : "0 2px 4px rgba(0,0,0,0.05)",
                  position: "relative"
                }}
                onMouseEnter={(e) => {
                  if (migrationApproach !== opt.value) {
                    e.currentTarget.style.borderColor = opt.color;
                    e.currentTarget.style.boxShadow = `0 4px 12px ${opt.color}15`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (migrationApproach !== opt.value) {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 24 }}>{opt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>{opt.label}</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>{opt.desc}</div>
                  </div>
                  {migrationApproach === opt.value && (
                    <div style={{ color: opt.color, fontSize: 18, fontWeight: 700 }}>✓</div>
                  )}
                </div>

                {/* Info button for tooltip */}
                <div style={{ position: "absolute", top: 12, right: 12 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      backgroundColor: "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#64748b",
                      cursor: "help"
                    }}
                    onMouseEnter={(e) => {
                      const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                      if (tooltip) tooltip.style.display = "block";
                    }}
                    onMouseLeave={(e) => {
                      const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                      if (tooltip) tooltip.style.display = "none";
                    }}
                  >
                    i
                  </div>

                  {/* Tooltip */}
                  <div
                    style={{
                      display: "none",
                      position: "absolute",
                      top: 28,
                      right: 0,
                      width: 280,
                      backgroundColor: "#1e293b",
                      color: "#f1f5f9",
                      padding: "12px 16px",
                      borderRadius: 8,
                      fontSize: 12,
                      lineHeight: 1.5,
                      zIndex: 1000,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                      whiteSpace: "normal"
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 8, color: "#94a3b8" }}>
                      {opt.label} Details
                    </div>
                    <div>{opt.tooltip}</div>
                    {/* Arrow */}
                    <div style={{
                      position: "absolute",
                      top: -6,
                      right: 16,
                      width: 0,
                      height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderBottom: "6px solid #1e293b"
                    }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

        <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Source Java Version</label>
              <div style={{
                padding: "12px 14px",
                fontSize: 14,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                backgroundColor: "#f9fafb",
                color: userSelectedVersion ? "#1e293b" : "#6b7280",
                fontWeight: userSelectedVersion ? 600 : 500
              }}>
                {userSelectedVersion
                  ? `Java ${selectedSourceVersion} (manually selected)`
                  : (repoAnalysis?.java_version && repoAnalysis?.java_version !== "unknown"
                      ? `Java ${repoAnalysis.java_version} (detected)`
                      : "Source don't have a java version")
                }
              </div>
              <p style={styles.helpText}>
                {userSelectedVersion
                  ? "Source version manually selected in discovery step"
                  : (repoAnalysis?.java_version && repoAnalysis?.java_version !== "unknown"
                      ? "Java version detected from build configuration"
                      : "No Java version found - please select a source version below")
                }
              </p>
              {/* Show version selector when not detected */}
              {!userSelectedVersion && (!((repoAnalysis?.java_version || repoAnalysis?.java_version_from_build)) || (repoAnalysis?.java_version || repoAnalysis?.java_version_from_build) === "unknown") && (
                <div style={{ marginTop: 12 }}>
                  <select
                    value={selectedSourceVersion}
                    onChange={(e) => {
                      setSelectedSourceVersion(e.target.value);
                      setUserSelectedVersion(e.target.value); // Mark as user-selected
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 6,
                      border: "1px solid #d97706",
                      fontSize: 14,
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      width: "100%"
                    }}
                  >
                    <option value="7">Java 7 (Legacy)</option>
                    <option value="8">Java 8 (LTS)</option>
                    <option value="11">Java 11 (LTS)</option>
                    <option value="17">Java 17 (LTS)</option>
                    <option value="21">Java 21 (LTS)</option>
                  </select>
                  <div style={{ fontSize: 11, color: "#a16207", marginTop: 6 }}>
                    💡 Select the correct Java version for your project. This will be used as the source version for migration.
                  </div>
                </div>
              )}
            </div>
          <div style={styles.field}>
            <label style={styles.label}>Target Java Version</label>
            {versionRecommendationLoading && (
              <div style={{ ...styles.infoBox, marginBottom: 12 }}>
                Fetching recommmendations for target Java versions from Hugging Face based on your project analysis...
                {/* Analyzing source version, build configuration, frameworks, dependencies, and migration risk... */}
              </div>
            )}

{/* newchange */}
            {!versionRecommendationLoading && versionRecommendationError && (
              <div style={{ ...styles.warningBox, marginBottom: 12, color: "#92400e", fontSize: 13 }}>
                Remote recommendation unavailable ({versionRecommendationError}). Showing the frontend compatibility ranking instead.
              </div>
            )}
            <select style={styles.select} value={selectedTargetVersion} onChange={(e) => setSelectedTargetVersion(e.target.value)}>
              <option value="" disabled>Select Java Version</option>
              {availableTargetVersions.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
            <p style={styles.helpText}>Choose a ranked recommendation below or manually select any newer supported version.</p>
          </div>
        </div>

      {!versionRecommendationLoading && rankedJavaRecommendations.length > 0 && (
        <section className="java-recommendations" aria-labelledby="java-recommendations-title">
          <div className="java-recommendations__header">
            <div>
              <div className="java-recommendations__eyebrow">Migration compatibility analysis</div>
              <h3 id="java-recommendations-title">Ranked target Java versions</h3>
              <p>
                Compact ranking based on source version, build setup, dependencies, LTS support,
                security, performance, and enterprise adoption.
              </p>
            </div>
            <div className="java-recommendations__count">
              {rankedJavaRecommendations.length} options analyzed
            </div>
          </div>

          <div className="java-recommendations__list">
            {rankedJavaRecommendations.map((recommendation, index) => {
              const isSelected = selectedTargetVersion === recommendation.javaVersion;
              return (
                <article
                  key={recommendation.javaVersion}
                  className={`inner-card-hover strategy-inner-card java-recommendation-card${isSelected ? " java-recommendation-card--selected" : ""}`}
                >
                  <div className="java-recommendation-card__top">
                    <div className="java-recommendation-card__rank">#{index + 1}</div>
                    <div className="java-recommendation-card__title">
                      <span>Java {recommendation.javaVersion}</span>
                      <span className={`java-recommendation-card__level java-recommendation-card__level--${recommendation.recommendationLevel.toLowerCase().replaceAll(" ", "-")}`}>
                        {recommendation.recommendationLevel}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`java-recommendation-card__select${isSelected ? " java-recommendation-card__select--selected" : ""}`}
                      onClick={() => setSelectedTargetVersion(recommendation.javaVersion)}
                    >
                      {isSelected ? "Selected" : "Select version"}
                    </button>
                  </div>

                  <p className="java-recommendation-card__description">
                    {recommendation.description}
                  </p>

                  <ul className="java-recommendation-card__benefits">
                    {recommendation.keyBenefits.slice(0, 2).map((benefit) => <li key={benefit}>{benefit}</li>)}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      )}
{/* // */}

      <div style={styles.field}>
        <label style={styles.label}>{migrationApproach === "branch" ? "Target Branch Name" : "Target Repository Name"}</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input 
            type="text" 
            style={{ ...styles.input, flex: 1, backgroundColor: "#f0fdf4", borderColor: "#22c55e" }} 
            value={targetRepoName} 
            onChange={(e) => setTargetRepoName(e.target.value)} 
            placeholder={
              migrationApproach === "branch"
                ? buildTargetBranchName(selectedRepo?.name || "repo", targetRepoTimestamp)
                : buildTargetRepoUrl(selectedRepo?.name || "repo", targetRepoTimestamp)
            }
          />
        </div>
        <p style={styles.helpText}>
          Format: <code style={{ backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
            {migrationApproach === "branch"
              ? <>migration/{'{source-repo}'}-Migrated{'{timestamp}'}</>
              : <>https://github.com/Pavithra-Sorim/{'{source-repo}'}-Migrated{'{timestamp}'}</>}
          </code> (auto-generated, editable)
        </p>
      </div>

      <div style={styles.btnRow}>
        <button style={styles.secondaryBtn} onClick={() => setStep(2)}>← Back</button>
        <button style={styles.primaryBtn} onClick={() => setStep(4)}>Continue to Migration →</button>
      </div>
    </div>
  );

  return renderStrategyStep();
}
