import React from "react";
import { styles } from "../../pages/styles";
import type { MigrationResult } from "../../types/migration";

interface SummaryCardProps {
  migrationJob: MigrationResult;
}

export function SummaryCard({ migrationJob }: SummaryCardProps) {
  return (
    <>
      {/* Source and Target Repository Information */}
      <div style={styles.reportSection}>
        <h3 style={styles.reportTitle}>🏗️ Repository Information</h3>
        <div style={styles.reportGrid}>
          <div style={styles.reportItem}>
            <span style={styles.reportLabel}>Source Repository</span>
            <span style={styles.reportValue}>
              {migrationJob.source_repo && migrationJob.source_repo.startsWith("http") ? (
                <a
                  href={migrationJob.source_repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563eb", textDecoration: "none" }}
                >
                  {migrationJob.source_repo}
                </a>
              ) : (
                migrationJob.source_repo
              )}
            </span>
          </div>
          <div style={styles.reportItem}>
            <span style={styles.reportLabel}>Target Repository</span>
            <span style={styles.reportValue}>
              {migrationJob.target_repo && migrationJob.target_repo.startsWith("http") ? (
                <a
                  href={migrationJob.target_repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#22c55e", textDecoration: "none" }}
                >
                  {migrationJob.target_repo}
                </a>
              ) : (
                migrationJob.target_repo || "N/A"
              )}
            </span>
          </div>
          <div style={styles.reportItem}>
            <span style={styles.reportLabel}>Java Version Migration</span>
            <span style={styles.reportValue}>
              {migrationJob.source_java_version} → {migrationJob.target_java_version}
            </span>
          </div>
          <div style={styles.reportItem}>
            <span style={styles.reportLabel}>Migration Completed</span>
            <span style={styles.reportValue}>
              {migrationJob.completed_at
                ? new Date(migrationJob.completed_at).toLocaleString()
                : "In Progress"}
            </span>
          </div>
        </div>
      </div>

      {/* Changes Made */}
      <div style={styles.reportSection}>
        <h3 style={styles.reportTitle}>🔄 Changes Made</h3>
        <div style={styles.changesGrid}>
          <div style={styles.changeItem}>
            <span style={styles.changeIcon}>📄</span>
            <div>
              <div style={styles.changeTitle}>Files Modified</div>
              <div style={styles.changeValue}>{migrationJob.files_modified} files updated</div>
            </div>
          </div>
          <div style={styles.changeItem}>
            <span style={styles.changeIcon}>🔧</span>
            <div>
              <div style={styles.changeTitle}>Code Transformations</div>
              <div style={styles.changeValue}>{migrationJob.issues_fixed} code issues fixed</div>
            </div>
          </div>
          <div style={styles.changeItem}>
            <span style={styles.changeIcon}>📦</span>
            <div>
              <div style={styles.changeTitle}>Dependencies Updated</div>
              <div style={styles.changeValue}>
                {migrationJob.dependencies?.filter((d) => d.status === "upgraded").length || 0}{" "}
                dependencies upgraded
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dependencies Fixed */}
      <div style={styles.reportSection}>
        <h3 style={styles.reportTitle}>📦 Dependencies Fixed</h3>
        {migrationJob.dependencies && migrationJob.dependencies.length > 0 ? (
          <div style={styles.dependenciesReport}>
            {migrationJob.dependencies.map((dep, idx) => (
              <div key={idx} style={styles.dependencyReportItem}>
                <span style={styles.dependencyName}>
                  {dep.group_id}:{dep.artifact_id}
                </span>
                <span style={styles.dependencyChange}>
                  {dep.current_version} → {dep.new_version || "latest"}
                </span>
                <span
                  style={{
                    ...styles.dependencyStatus,
                    backgroundColor: dep.status === "upgraded" ? "#dcfce7" : "#e5e7eb",
                    color: dep.status === "upgraded" ? "#166534" : "#6b7280",
                  }}
                >
                  {dep.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.noData}>No dependency updates were required</div>
        )}
      </div>

      {/* Errors Fixed */}
      <div style={styles.reportSection}>
        <h3 style={styles.reportTitle}>🐛 Errors Fixed</h3>
        <div style={styles.errorsSummary}>
          <div style={styles.errorStat}>
            <span style={styles.errorCount}>{migrationJob.errors_fixed || 0}</span>
            <span style={styles.errorLabel}>Errors Fixed</span>
          </div>
          <div style={styles.errorStat}>
            <span style={styles.errorCount}>{migrationJob.total_errors}</span>
            <span style={styles.errorLabel}>Remaining Errors</span>
          </div>
          <div style={styles.errorStat}>
            <span style={styles.errorCount}>{migrationJob.total_warnings}</span>
            <span style={styles.errorLabel}>Warnings</span>
          </div>
        </div>
      </div>

      {/* Business Logic Fixed */}
      <div style={styles.reportSection}>
        <h3 style={styles.reportTitle}>🧠 Business Logic Improvements</h3>
        <div style={styles.businessLogicGrid}>
          <div style={styles.businessItem}>
            <span style={styles.businessIcon}>🛡️</span>
            <div>
              <div style={styles.businessTitle}>Null Safety</div>
              <div style={styles.businessDesc}>Added null checks and Objects.equals() usage</div>
            </div>
          </div>
          <div style={styles.businessItem}>
            <span style={styles.businessIcon}>⚡</span>
            <div>
              <div style={styles.businessTitle}>Performance</div>
              <div style={styles.businessDesc}>Optimized String operations and collections</div>
            </div>
          </div>
          <div style={styles.businessItem}>
            <span style={styles.businessIcon}>🔧</span>
            <div>
              <div style={styles.businessTitle}>Code Quality</div>
              <div style={styles.businessDesc}>Improved exception handling and logging</div>
            </div>
          </div>
          <div style={styles.businessItem}>
            <span style={styles.businessIcon}>📝</span>
            <div>
              <div style={styles.businessTitle}>Modern APIs</div>
              <div style={styles.businessDesc}>Updated to use latest Java APIs and patterns</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SummaryCard;
