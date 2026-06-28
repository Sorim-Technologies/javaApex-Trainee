import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";

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

  // Consolidated Step 4: Migration (Build Modernization & Refactor + Code Migration + Testing)
  const renderMigrationStep = () => {
    const apiEndpointCount = repoAnalysis?.api_endpoints?.length ?? 0;
    const codeRefactoringEndpointLabel = `API endpoints: ${apiEndpointCount}`;

    return (
    <div style={styles.card}>
      <div style={styles.stepHeader}>
        <span style={styles.stepIcon}>⚡</span>
        <div>
          <h2 style={styles.title}>Build Modernization & Migration</h2>
          <p style={styles.subtitle}>{MIGRATION_STEPS[3].summary}</p>
        </div>
      </div>

      {/* Show what we plan to modernize */}
      <div style={styles.sectionTitle}>🎯 Migration Configuration</div>

      {/* What we'll modernize - Card Design */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          ✨ What we'll modernize
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {[
            {
              icon: "☕",
              title: "Java Version Upgrade",
              desc: `From Java ${selectedSourceVersion} to Java ${selectedTargetVersion || "Select Java Version"}`,
              color: "#2563eb"
            },
            {
              icon: "🔧",
              title: "Code Refactoring",
              desc: apiEndpointCount > 0
                ? `Modernize code patterns across ${apiEndpointCount} detected API endpoint${apiEndpointCount === 1 ? "" : "s"}`
                : "Modernize code patterns and best practices",
              color: "#059669",
              showInfo: true,
              tooltipContent: plannedCodeRefactoringTooltip,
              detail: codeRefactoringEndpointLabel
            },
            {
              icon: "📦",
              title: "Dependencies",
              desc: "Update and ensure compatibility",
              color: "#7c3aed",
              showInfo: true
            },
            {
              icon: "🧠",
              title: "Business Logic",
              desc: "Improve performance and reliability",
              color: "#dc2626",
              showInfo: true
            },
            {
              icon: "🧪",
              title: "Testing",
              desc: "Execute and validate test suites",
              color: "#ea580c"
            },
            {
              icon: "🔍",
              title: "Code Quality",
              desc: "Analysis and improvement",
              color: "#0891b2"
            }
          ].filter((item) => item.title !== "Code Quality").map((item, idx) => (
            <div
              key={idx}
              className="inner-card-hover migration-modernize-card"
              style={{
                "--inner-card-accent": item.color,
                "--inner-card-bg": `${item.color}12`,
                "--inner-card-shadow": `${item.color}30`,
                position: "relative",
                padding: 20,
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                transition: "all 0.2s ease",
                cursor: "default"
              } as React.CSSProperties}
            >
              {item.showInfo && (
                <div style={{ position: "absolute", top: 12, right: 12 }}>
                  <button
                    type="button"
                    aria-label={`${item.title} information`}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#fff",
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
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
                  </button>
                  <div
                    style={{
                      ...styles.tooltip,
                      left: "auto",
                      right: 0,
                      width: 320,
                      minHeight: 140,
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.display = "block";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  >
                    {item.tooltipContent && (
                      <div
                        style={{
                          height: "100%",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "flex-start",
                          width: "100%",
                        }}
                      >
                        {item.tooltipContent}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: `${item.color}10`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>
                    {item.desc}
                  </div>
                  {item.detail && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        marginTop: 8,
                        padding: "4px 10px",
                        borderRadius: 999,
                        backgroundColor: `${item.color}12`,
                        color: item.color,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {item.detail}
                    </div>
                  )}
                </div>
              </div>
              <div style={{
                width: "100%",
                height: 4,
                backgroundColor: `${item.color}20`,
                borderRadius: 2,
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: item.color,
                  borderRadius: 2
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>
          Preview code changes
        </div>
        <div className="inner-card-hover migration-preview-card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, backgroundColor: "#fff" }}>
          {migrationPreviewLoading && (
            <div style={{ fontSize: 14, color: "#475569" }}>
              Analyzing the connected repository and building a real migration preview...
            </div>
          )}

          {!migrationPreviewLoading && migrationPreviewError && (
            <div style={{ fontSize: 14, color: "#b91c1c" }}>
              {migrationPreviewError}
            </div>
          )}

          {!migrationPreviewLoading && !migrationPreviewError && migrationPreview && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                <div className="inner-card-hover migration-chip-card migration-chip-card--files" style={{ padding: "8px 12px", borderRadius: 999, backgroundColor: "#eff6ff", color: "#1d4ed8", fontSize: 13, fontWeight: 600 }}>
                  {migrationPreview.summary.files_to_modify} files to modify
                </div>
                <div className="inner-card-hover migration-chip-card migration-chip-card--changes" style={{ padding: "8px 12px", borderRadius: 999, backgroundColor: "#ecfdf5", color: "#047857", fontSize: 13, fontWeight: 600 }}>
                  {migrationPreview.summary.total_changes} planned changes
                </div>
                <div className="inner-card-hover migration-chip-card migration-chip-card--diffs" style={{ padding: "8px 12px", borderRadius: 999, backgroundColor: "#faf5ff", color: "#7c3aed", fontSize: 13, fontWeight: 600 }}>
                  {migrationPreview.file_diffs.length} preview diffs
                </div>
              </div>

              {codeChanges.length > 0 ? (
                <div className="inner-card-hover migration-diff-card" style={{ border: "1px solid #d0d7de", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: "#f8fafc", borderBottom: "1px solid #d0d7de" }}>
                    <span style={{ fontWeight: 600, color: "#1e293b" }}>Repo-specific migration diff preview</span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Read only</span>
                  </div>
                  <div style={{ maxHeight: 420, overflowY: "auto" }}>
                    {codeChanges.map((change, idx) => (
                      <div key={idx}>
                        <div
                          onClick={() => setSelectedDiffFile(selectedDiffFile === change.filePath ? null : change.filePath)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 16px",
                            backgroundColor: selectedDiffFile === change.filePath ? "#f0f6fc" : "#fafbfc",
                            borderBottom: "1px solid #d0d7de",
                            cursor: "pointer"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 14 }}>{selectedDiffFile === change.filePath ? "▼" : "▶"}</span>
                            <span style={{ fontFamily: "'JetBrains Mono', 'Consolas', monospace", fontSize: 13, color: "#0969da" }}>
                              {change.filePath}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 600 }}>+{change.additions}</span>
                            <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}>-{change.deletions}</span>
                          </div>
                        </div>

                        {selectedDiffFile === change.filePath && (
                          <div style={{ backgroundColor: "#0d1117", overflowX: "auto" }}>
                            <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", fontSize: 12, lineHeight: 1.5 }}>
                              {change.diffLines.map((line, lineIdx) => (
                                <div
                                  key={lineIdx}
                                  style={{
                                    display: "flex",
                                    backgroundColor: line.type === "add" ? "rgba(63, 185, 80, 0.15)" : line.type === "remove" ? "rgba(248, 81, 73, 0.15)" : "transparent",
                                    borderLeft: `4px solid ${line.type === "add" ? "#3fb950" : line.type === "remove" ? "#f85149" : "transparent"}`
                                  }}
                                >
                                  <span style={{ minWidth: 50, padding: "2px 10px", textAlign: "right", color: "#6e7681", backgroundColor: "rgba(110,118,129,0.1)", userSelect: "none" }}>
                                    {line.lineNumber}
                                  </span>
                                  <span style={{ width: 24, padding: "2px 6px", textAlign: "center", color: line.type === "add" ? "#3fb950" : line.type === "remove" ? "#f85149" : "#8b949e", userSelect: "none" }}>
                                    {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                                  </span>
                                  <span style={{ flex: 1, padding: "2px 12px", color: "#e6edf3", whiteSpace: "pre" }}>
                                    {line.content}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: "#475569" }}>
                  No file-level diff preview is available for this repository yet.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Conversion Types</label>
        <select style={styles.select} value={selectedConversions[0] || ""} onChange={(e) => {
          setSelectedConversions(e.target.value ? [e.target.value] : []);
        }}>
          <option value="">-- Select Conversion Type --</option>
          {conversionTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>{ct.name} - {ct.description}</option>
          ))}
        </select>
        {selectedConversions.length > 0 && (
          <div className="inner-card-hover migration-conversion-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", backgroundColor: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 8, marginTop: 12 }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#0c4a6e" }}>
              ✓ {conversionTypes.find((c) => c.id === selectedConversions[0])?.name} selected
            </span>
            <button style={{ background: "none", border: "none", color: "#0c4a6e", cursor: "pointer", fontSize: 18, padding: 0 }} onClick={() => setSelectedConversions([])}>×</button>
          </div>
        )}
      </div>


      <div style={styles.field}>
        <label style={styles.label}>Migration Options</label>
        <div 
        style={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", alignItems: 'stretch'}}>
          {[
            {
              key: "runTests",
              checked: runTests,
              onChange: (checked: boolean) => setRunTests(checked),
              title: "Run Test Suite",
              desc: "Execute automated tests after migration",
              tooltip: "Runs the project's test suite to ensure all functionality works correctly after migration. Includes unit tests, integration tests, and any configured test frameworks. Highly recommended to verify migration success.",
              icon: "🧪",
              color: "#22c55e",
              recommended: true
            },
            {
              key: "runSonar",   
              checked: runSonar,
              onChange: (checked: boolean) => setRunSonar(checked),
              title: "SonarQube Analysis",
              desc: "Run code quality and security analysis",
              tooltip: "Performs comprehensive code quality analysis using SonarQube. Checks for bugs, vulnerabilities, code smells, test coverage, and maintainability metrics. Provides detailed quality gate status.",
              icon: "🔍",
              color: "#f59e0b",
              recommended: false
            },
            {
              key: "runFossa",
              checked: runFossa,
              onChange: (checked: boolean) => setRunFossa(checked),
              title: "FOSSA License & Dependency Scan",
              desc: "Run open-source dependency and license compliance analysis",
              tooltip: "Scans project dependencies to detect open-source licenses, security risks, policy violations, and supply chain vulnerabilities. Generates a Software Bill of Materials (SBOM) and compliance reports.",
              icon: "📜",
              color: "#f59e0b",
              recommended: false
            },
            {
              key: "fixBusinessLogic",
              checked: fixBusinessLogic,
              onChange: (checked: boolean) => setFixBusinessLogic(checked),
              title: "Fix Business Logic Issues",
              desc: "Automatically improve code quality and patterns",
              tooltip: "Applies automated code improvements including null safety, performance optimizations, modern API usage, and best practice implementations. Enhances code maintainability and reduces technical debt.",
              icon: "🛠️",
              color: "#3b82f6",
              recommended: true
            }
          ].map((option) => (
            <div key={option.key} style={{ position: "relative", height: '100%' }}>
              <div
              className="inner-card-hover migration-option-card"
              onClick={() => {
              if (option.key === "runSonar") {
                  setRunSonar(!runSonar);
                  setRunFossa(false);
                  return;
                }
               if (option.key === "runFossa") {
                  setRunFossa(!runFossa);
                  setRunSonar(false);
                  return;
                }

              option.onChange(!option.checked);
}}
                style={{
                  padding: 20,
                  borderRadius: 12,
                  border: `2px solid ${option.checked ? option.color : "#e2e8f0"}`,
                  backgroundColor: option.checked ? `${option.color}08` : "#fff",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: option.checked ? `0 4px 12px ${option.color}20` : "0 2px 4px rgba(0,0,0,0.05)",
                  position: "relative",
                  height: "100%",
                  minHeight: 132,       
                  display: "flex",              
                  flexDirection: "column"         
                }}
                
                onMouseEnter={(e) => {
                  if (!option.checked) {
                    e.currentTarget.style.borderColor = option.color;
                    e.currentTarget.style.boxShadow = `0 4px 12px ${option.color}15`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!option.checked) {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <span style={{ fontSize: 24 }}>{option.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "#1e293b" }}>{option.title}</span>
                      {option.recommended && (
                        <span style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          borderRadius: 8,
                          fontWeight: 600,
                          textTransform: "uppercase"
                        }}>
                          Recommended
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>{option.desc}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 64, justifyContent: "flex-end" }}>
                    <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: option.color, fontSize: 18, fontWeight: 700 }}>
                      {option.checked ? '✓' : null}
                    </div>
                    <input
                      type="checkbox"
                      checked={option.checked}
                      onChange={(e) => option.onChange(e.target.checked)}
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: option.color,
                        cursor: "pointer"
                      }}
                    />
                  </div>
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
                      width: 320,
                      backgroundColor: "#1e293b",
                      color: "#f1f5f9",
                      padding: "14px 18px",
                      borderRadius: 10,
                      fontSize: 12,
                      lineHeight: 1.5,
                      zIndex: 1000,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                      whiteSpace: "normal"
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 10, color: "#94a3b8", fontSize: 13 }}>
                      {option.title} Details
                    </div>

{/* newchange */}
                    <div style={{ marginBottom: 8 }}>{option.tooltip}</div>
                    {option.recommended && (
                      <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, marginTop: 6 }}>
                        💡 Recommended for most migrations
                      </div>
                    )}
{/* // */}

                    {/* Arrow */}
                    <div style={{
                      position: "absolute",
                      top: -6,
                      right: 20,
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

      <div style={styles.btnRow}>
        <button style={styles.secondaryBtn} onClick={() => setStep(3)}>← Back</button>
        <button style={{ ...styles.primaryBtn, opacity: loading ? 0.5 : 1 }} onClick={handleStartMigration} disabled={loading}>
          {loading ? "Starting..." : "🚀 Start Migration"}
        </button>
      </div>
    </div>
  );

  };

  return renderMigrationStep();
}
