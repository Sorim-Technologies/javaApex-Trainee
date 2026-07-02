import React from "react";
import { styles } from "../../pages/styles";

interface LogViewerProps {
  logs: string[];
}

export function LogViewer({ logs }: LogViewerProps) {
  return (
    <div style={styles.reportSection}>
      <h3 style={styles.reportTitle}>📋 Migration Log</h3>
      <div style={styles.logsContainer}>
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={index} style={styles.logEntry}>
              {log}
            </div>
          ))
        ) : (
          <div style={styles.noLogs}>No migration logs available</div>
        )}
      </div>
    </div>
  );
}

export default LogViewer;
