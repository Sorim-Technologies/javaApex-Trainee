import React from "react";
import { styles } from "../../pages/styles";
import type { MigrationStepProps } from "./MigrationTypes";

type MigrationOptionsCheckboxProps = Pick<
  MigrationStepProps,
  | "runTests"
  | "setRunTests"
  | "runSonar"
  | "setRunSonar"
  | "runFossa"
  | "setRunFossa"
  | "fixBusinessLogic"
  | "setFixBusinessLogic"
>;

export function MigrationOptionsCheckbox({
  runTests,
  setRunTests,
  runSonar,
  setRunSonar,
  runFossa,
  setRunFossa,
  fixBusinessLogic,
  setFixBusinessLogic,
}: MigrationOptionsCheckboxProps) {
  const options = [
    {
      key: "runTests",
      checked: runTests,
      onChange: (checked: boolean) => setRunTests(checked),
      title: "Run Test Suite",
      desc: "Execute automated tests after migration",
      tooltip:
        "Runs the project's test suite to ensure all functionality works correctly after migration. Highly recommended to verify migration success.",
      icon: "🧪",
      color: "#22c55e",
      recommended: true,
    },
    {
      key: "runSonar",
      checked: runSonar,
      onChange: (checked: boolean) => {
        setRunSonar(checked);
        setRunFossa(false);
      },
      title: "SonarQube Analysis",
      desc: "Run code quality and security analysis",
      tooltip:
        "Performs comprehensive code quality analysis using SonarQube. Checks for bugs, vulnerabilities, code smells, and coverage.",
      icon: "🔍",
      color: "#f59e0b",
      recommended: false,
    },
    {
      key: "runFossa",
      checked: runFossa,
      onChange: (checked: boolean) => {
        setRunFossa(checked);
        setRunSonar(false);
      },
      title: "FOSSA License & Scan",
      desc: "Run license compliance analysis",
      tooltip:
        "Scans dependencies to detect open-source licenses, security risks, policy violations, and license compliance.",
      icon: "📜",
      color: "#f59e0b",
      recommended: false,
    },
    {
      key: "fixBusinessLogic",
      checked: fixBusinessLogic,
      onChange: (checked: boolean) => setFixBusinessLogic(checked),
      title: "Fix Business Logic Issues",
      desc: "Automatically improve code quality and patterns",
      tooltip:
        "Applies automated code improvements including null safety, performance optimizations, and modern API usage.",
      icon: "🛠️",
      color: "#3b82f6",
      recommended: true,
    },
  ];

  return (
    <div style={styles.field}>
      <label style={styles.label}>Migration Options</label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
          alignItems: "stretch",
        }}
      >
        {options.map((option) => (
          <div key={option.key} style={{ position: "relative", height: "100%" }}>
            <div
              onClick={() => option.onChange(!option.checked)}
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
                flexDirection: "column",
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
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          borderRadius: 8,
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        Recommended
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{option.desc}</div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 64,
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: option.color,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {option.checked ? "✓" : null}
                  </div>
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={(e) => option.onChange(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: option.color,
                      cursor: "pointer",
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
                    cursor: "help",
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
                    backgroundColor: "#ffffff",
                    color: "#f1f5f9",
                    padding: "14px 18px",
                    borderRadius: 10,
                    fontSize: 12,
                    lineHeight: 1.5,
                    zIndex: 1000,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    whiteSpace: "normal",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 10, color: "#64748b", fontSize: 13 }}>
                    {option.title} Details
                  </div>
                  <div style={{ color: "#334155", marginBottom: 8 }}>{option.tooltip}</div>
                  {option.recommended && (
                    <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, marginTop: 6 }}>
                      💡 Recommended for most migrations
                    </div>
                  )}
                  {/* Arrow */}
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      right: 20,
                      width: 0,
                      height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderBottom: "6px solid #ffffff",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MigrationOptionsCheckbox;
