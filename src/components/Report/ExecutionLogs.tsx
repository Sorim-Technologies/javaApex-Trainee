import React from "react";
import { styles } from "../../pages/styles";
import type { MigrationResult } from "../../types/migration";

interface ExecutionLogsProps {
  migrationLogs: string[];
  migrationJob: MigrationResult;
}

export function ExecutionLogs({
  migrationLogs,
  migrationJob,
}: ExecutionLogsProps) {
  return (
    <>
      {/* Migration Log */}
      <div style={styles.reportSection}>
        <h3 style={styles.reportTitle}>📋 Migration Log</h3>
        <div style={styles.logsContainer}>
          {migrationLogs.length > 0 ? (
            migrationLogs.map((log, index) => (
              <div key={index} style={styles.logEntry}>
                {log}
              </div>
            ))
          ) : (
            <div style={styles.noLogs}>No migration logs available</div>
          )}
        </div>
      </div>

      {/* Issues & Errors Detailed */}
      <div style={styles.reportSection}>
        <h3 style={styles.reportTitle}>⚠️ Detailed Issues & Errors</h3>
        <div style={styles.issuesContainer}>
          {migrationJob.issues && migrationJob.issues.length > 0 ? (
            migrationJob.issues.slice(0, 10).map((issue) => (
              <div key={issue.id} style={styles.issueItem}>
                <div style={styles.issueHeader}>
                  <span
                    style={{
                      ...styles.issueSeverity,
                      backgroundColor:
                        issue.severity === "error"
                          ? "#fee2e2"
                          : issue.severity === "warning"
                          ? "#fef3c7"
                          : "#e0f2fe",
                    }}
                  >
                    {issue.severity.toUpperCase()}
                  </span>
                  <span style={styles.issueCategory}>{issue.category}</span>
                  <span style={styles.issueStatus}>{issue.status}</span>
                </div>
                <div style={styles.issueMessage}>{issue.message}</div>
                <div style={styles.issueFile}>
                  {issue.file_path}:{issue.line_number}
                </div>
              </div>
            ))
          ) : (
            <div style={styles.noIssues}>No issues found - migration completed successfully!</div>
          )}
        </div>
      </div>
    </>
  );
}

export default ExecutionLogs;
