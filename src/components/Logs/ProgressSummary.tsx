import React from "react";
import { styles } from "../../pages/styles";
import type { MigrationResult } from "../../types/migration";
import type { LogStatisticsData } from "./LogsTypes";

interface ProgressSummaryProps {
  migrationJob: MigrationResult | null;
  statistics: LogStatisticsData;
  selectedRepo?: any;
}

export const ProgressSummary: React.FC<ProgressSummaryProps> = ({
  migrationJob,
  statistics,
  selectedRepo,
}) => {
  const javaVersion = migrationJob
    ? `${migrationJob.source_java_version || "8"} → ${migrationJob.target_java_version || "17"}`
    : "8 → 17";

  return (
    <div style={styles.card}>
      <h3 style={{ ...styles.sectionTitle, marginTop: 0 }}>📋 Migration Progress Summary</h3>
      <div style={styles.reportGrid}>
        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Repository Status</span>
          <span style={{ ...styles.reportValue, color: migrationJob?.status === "failed" ? "#ef4444" : migrationJob?.status === "completed" ? "#10b981" : "#3b82f6" }}>
            {migrationJob?.status?.toUpperCase() || "INITIALIZING"}
          </span>
        </div>

        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Current Stage</span>
          <span style={styles.reportValue}>
            {migrationJob?.current_step || "Queued"}
          </span>
        </div>

        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Java Version</span>
          <span style={styles.reportValue}>
            {javaVersion}
          </span>
        </div>

        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Files Processed</span>
          <span style={styles.reportValue}>
            {migrationJob?.files_modified !== undefined ? migrationJob.files_modified : "0"} files
          </span>
        </div>

        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Migration Progress</span>
          <span style={{ ...styles.reportValue, color: "var(--primary)" }}>
            {migrationJob?.progress_percent !== undefined ? `${migrationJob.progress_percent}%` : "0%"}
          </span>
        </div>

        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Total Warnings</span>
          <span style={{ ...styles.reportValue, color: statistics.warning > 0 ? "#f59e0b" : "var(--foreground)" }}>
            {statistics.warning}
          </span>
        </div>

        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Total Errors</span>
          <span style={{ ...styles.reportValue, color: statistics.error > 0 ? "#ef4444" : "var(--foreground)" }}>
            {statistics.error}
          </span>
        </div>

        <div style={styles.reportItem}>
          <span style={styles.reportLabel}>Execution Time</span>
          <span style={styles.reportValue}>
            {migrationJob?.completed_at && migrationJob?.started_at
              ? `${Math.round((new Date(migrationJob.completed_at).getTime() - new Date(migrationJob.started_at).getTime()) / 1000)}s`
              : "Active"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProgressSummary;
