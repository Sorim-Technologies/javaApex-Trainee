import React from "react";
import { styles } from "../../pages/styles";
import type { LogStatisticsData } from "./LogsTypes";

interface LogStatisticsProps {
  statistics: LogStatisticsData;
}

export const LogStatistics: React.FC<LogStatisticsProps> = ({ statistics }) => {
  return (
    <div style={styles.statsGrid}>
      <div style={styles.statBox}>
        <div style={styles.statValue}>{statistics.total}</div>
        <div style={styles.statLabel}>Total Logs</div>
      </div>
      <div style={styles.statBox}>
        <div style={{ ...styles.statValue, color: "#3b82f6" }}>{statistics.info}</div>
        <div style={styles.statLabel}>Info</div>
      </div>
      <div style={styles.statBox}>
        <div style={{ ...styles.statValue, color: "#10b981" }}>{statistics.success}</div>
        <div style={styles.statLabel}>Success</div>
      </div>
      <div style={styles.statBox}>
        <div style={{ ...styles.statValue, color: "#f59e0b" }}>{statistics.warning}</div>
        <div style={styles.statLabel}>Warnings</div>
      </div>
      <div style={styles.statBox}>
        <div style={{ ...styles.statValue, color: "#ef4444" }}>{statistics.error}</div>
        <div style={styles.statLabel}>Errors</div>
      </div>
    </div>
  );
};

export default LogStatistics;