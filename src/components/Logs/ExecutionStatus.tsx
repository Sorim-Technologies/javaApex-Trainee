import React from "react";
import { styles } from "../../pages/styles";
import type { MigrationResult } from "../../types/migration";

interface ExecutionStatusProps {
  migrationJob: MigrationResult | null;
}

export const ExecutionStatus: React.FC<ExecutionStatusProps> = ({ migrationJob }) => {
  if (!migrationJob) {
    return (
      <div style={styles.infoBox}>
        ℹ️ Migration has not started yet. Ready to initialize.
      </div>
    );
  }

  const isFailed = migrationJob.status === "failed";
  const isCompleted = migrationJob.status === "completed";

  if (isFailed) {
    return (
      <div style={styles.errorBox}>
        <strong>❌ Migration Failed:</strong> {migrationJob.error_message || "An unexpected error occurred during execution."}
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div style={styles.successBox}>
        <div style={styles.successTitle}>🎉 Migration Completed Successfully!</div>
        {migrationJob.target_repo && (
          <a
            href={migrationJob.target_repo.startsWith("http") ? migrationJob.target_repo : `https://github.com/${migrationJob.target_repo}`}
            target="_blank"
            rel="noreferrer"
            style={styles.repoLink}
          >
            View Migrated Repository →
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={styles.infoBox}>
      ⏳ <strong>Status: {migrationJob.status?.toUpperCase() || "PROCESSING"}</strong> - {migrationJob.current_step || "Processing modernization recipes..."}
    </div>
  );
};

export default ExecutionStatus;
