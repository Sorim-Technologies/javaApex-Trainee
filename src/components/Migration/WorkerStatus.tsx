import React from "react";
import { styles } from "../../pages/styles";
import type { MigrationResult } from "../../types/migration";

interface WorkerStatusProps {
  migrationJob: MigrationResult;
}

export function WorkerStatus({ migrationJob }: WorkerStatusProps) {
  return (
    <div style={styles.statsGrid}>
      <div style={styles.statBox}>
        <div style={styles.statValue}>{migrationJob.files_modified}</div>
        <div style={styles.statLabel}>Files Modified</div>
      </div>
      <div style={styles.statBox}>
        <div style={styles.statValue}>{migrationJob.issues_fixed}</div>
        <div style={styles.statLabel}>Issues Fixed</div>
      </div>
      <div style={styles.statBox}>
        <div style={{ ...styles.statValue, color: migrationJob.total_errors > 0 ? "#ef4444" : "#22c55e" }}>
          {migrationJob.total_errors}
        </div>
        <div style={styles.statLabel}>Errors</div>
      </div>
      <div style={styles.statBox}>
        <div
          style={{ ...styles.statValue, color: migrationJob.total_warnings > 0 ? "#f59e0b" : "#22c55e" }}
        >
          {migrationJob.total_warnings}
        </div>
        <div style={styles.statLabel}>Warnings</div>
      </div>
    </div>
  );
}

export default WorkerStatus;
