import React, { useState } from "react";
import { FiBarChart2 } from "react-icons/fi";
import { isDetectedDependencyStatus, getDependencyStatusLabel } from "../../utils/formatters";
import { styles } from "../../pages/styles";
import type { RepoAnalysis, RepoInfo } from "../../types/migration";

interface StrategySummaryProps {
  selectedRepo: RepoInfo | null;
  repoAnalysis: RepoAnalysis | null;
  riskLevel: string;
}

export function StrategySummary({
  selectedRepo,
  repoAnalysis,
  riskLevel,
}: StrategySummaryProps) {
  const [showDependencies, setShowDependencies] = useState(false);

  if (!selectedRepo || !repoAnalysis) return null;

  return (
    <>
      <div style={styles.sectionTitle}>
        <FiBarChart2 size={20} />
        <span>Application Assessment</span>
      </div>
      <div
        style={{
          ...styles.riskBadge,
          backgroundColor:
            riskLevel === "low" ? "#dcfce7" : riskLevel === "medium" ? "#fef3c7" : "#fee2e2",
          color: riskLevel === "low" ? "#166534" : riskLevel === "medium" ? "#92400e" : "#991b1b",
        }}
      >
        Risk Level: {riskLevel.toUpperCase()}
      </div>

      <div style={styles.assessmentGrid}>
        <div style={styles.assessmentItem}>
          <div style={styles.assessmentLabel}>Build Tool</div>
          <div style={styles.assessmentValue}>{repoAnalysis.build_tool || "Not Detected"}</div>
        </div>

        <div style={styles.assessmentItem}>
          <div style={styles.assessmentLabel}>Java Version</div>
          <div style={styles.assessmentValue}>{repoAnalysis.java_version || "Unknown"}</div>
        </div>

        <div style={styles.assessmentItem}>
          <div style={styles.assessmentLabel}>Has Tests</div>
          <div style={styles.assessmentValue}>{repoAnalysis.has_tests ? "Yes" : "No"}</div>
        </div>

        <div
          style={{
            ...styles.assessmentItem,
            cursor: "pointer",
          }}
          onClick={() => setShowDependencies(!showDependencies)}
        >
          <div style={styles.assessmentLabel}>Dependencies</div>
          <div style={styles.assessmentValue}>{repoAnalysis.dependencies?.length || 0} found</div>
        </div>
      </div>

      {showDependencies && (
        <div style={styles.field}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <label style={styles.label}>
              Detected Dependencies ({repoAnalysis.dependencies?.length || 0})
            </label>

            <button
              onClick={() => setShowDependencies(false)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>

          <div style={styles.dependenciesList}>
            {repoAnalysis.dependencies?.map((dep, idx) => (
              <div key={idx} style={styles.dependencyItem}>
                <span style={{ flex: 2 }}>
                  {dep.group_id}:{dep.artifact_id}
                </span>

                <span
                  style={{
                    ...styles.dependencyVersion,
                    flex: 1,
                    textAlign: "center",
                  }}
                >
                  {dep.current_version}
                </span>

                <span
                  style={{
                    ...styles.detectedBadge,
                    flex: 1,
                    textAlign: "center",
                    backgroundColor: isDetectedDependencyStatus(dep.status) ? "#dcfce7" : "#e5e7eb",
                    color: isDetectedDependencyStatus(dep.status) ? "#166534" : "#6b7280",
                  }}
                >
                  {getDependencyStatusLabel(dep.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default StrategySummary;
