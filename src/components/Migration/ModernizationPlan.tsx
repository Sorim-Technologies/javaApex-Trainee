import React, { useMemo } from "react";
import { styles } from "../../pages/styles";
import { getPlannedRefactoringSteps } from "./MigrationHelpers";
import type { MigrationStepProps } from "./MigrationTypes";

type ModernizationPlanProps = Pick<
  MigrationStepProps,
  | "selectedSourceVersion"
  | "selectedTargetVersion"
  | "repoAnalysis"
  | "migrationPreview"
  | "fixBusinessLogic"
  | "setShowApiEndpoints"
>;

export function ModernizationPlan({
  selectedSourceVersion,
  selectedTargetVersion,
  repoAnalysis,
  migrationPreview,
  fixBusinessLogic,
  setShowApiEndpoints,
}: ModernizationPlanProps) {
  const apiEndpointCount = repoAnalysis?.api_endpoints?.length ?? 0;
  const codeRefactoringEndpointLabel = `API endpoints: ${apiEndpointCount}`;

  const plannedCodeRefactoringTooltip = useMemo(() => {
    const refactoringSteps = getPlannedRefactoringSteps(
      migrationPreview,
      selectedSourceVersion,
      selectedTargetVersion,
      repoAnalysis,
      fixBusinessLogic
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, color: "#334155" }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Planned refactoring</div>
        <div style={{ fontSize: 12, lineHeight: 1.45 }}>
          {refactoringSteps.map((stepItem, index) => (
            <div key={index} style={{ marginBottom: index === refactoringSteps.length - 1 ? 0 : 6 }}>
              {index + 1}. {stepItem}
            </div>
          ))}
        </div>
      </div>
    );
  }, [
    fixBusinessLogic,
    migrationPreview,
    repoAnalysis,
    selectedSourceVersion,
    selectedTargetVersion,
  ]);

  const items = [
    {
      icon: "☕",
      title: "Java Version Upgrade",
      desc: `From Java ${selectedSourceVersion} to Java ${selectedTargetVersion || "Select Java Version"}`,
      color: "#2563eb",
    },
    {
      icon: "🔧",
      title: "Code Refactoring",
      desc:
        apiEndpointCount > 0
          ? `Modernize code patterns across ${apiEndpointCount} detected API endpoint${
              apiEndpointCount === 1 ? "" : "s"
            }`
          : "Modernize code patterns and best practices",
      color: "#059669",
      showInfo: true,
      tooltipContent: plannedCodeRefactoringTooltip,
      detail: codeRefactoringEndpointLabel,
    },
    {
      icon: "📦",
      title: "Dependencies",
      desc: "Update and ensure compatibility",
      color: "#7c3aed",
      showInfo: true,
    },
    {
      icon: "🧠",
      title: "Business Logic",
      desc: "Improve performance and reliability",
      color: "#dc2626",
      showInfo: true,
    },
    {
      icon: "🧪",
      title: "Testing",
      desc: "Execute and validate test suites",
      color: "#ea580c",
    },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#1e293b",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        What we'll modernize
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            onClick={() => {
              if (item.title === "Code Refactoring") {
                setShowApiEndpoints(true);
              }
            }}
            style={{
              position: "relative",
              padding: 20,
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              transition: "all 0.2s ease",
              cursor: item.title === "Code Refactoring" ? "pointer" : "default",
            }}
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
                    backgroundColor: "#fff",
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
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: `${item.color}10`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>{item.desc}</div>
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
            <div
              style={{
                width: "100%",
                height: 4,
                backgroundColor: `${item.color}20`,
                borderRadius: 2,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: item.color,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ModernizationPlan;
