import React from "react";
import type { LogEntry } from "./LogsTypes";

interface LogLineProps {
  log: LogEntry;
  index: number;
}

const levelStyles = {
  INFO: {
    background: "rgba(59, 130, 246, 0.15)",
    color: "#60a5fa",
  },
  SUCCESS: {
    background: "rgba(34, 197, 94, 0.15)",
    color: "#4ade80",
  },
  WARNING: {
    background: "rgba(245, 158, 11, 0.15)",
    color: "#fbbf24",
  },
  ERROR: {
    background: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
  },
};

const LogLine: React.FC<LogLineProps> = ({ log, index }) => {
  const levelStyle = levelStyles[log.level] || levelStyles.INFO;

  return (
    <div style={styles.row}>
      <span style={styles.lineNumber}>
        {(index + 1).toString().padStart(3, "0")}
      </span>

      <span style={styles.timestamp}>
        {log.timestamp}
      </span>

      <span
        style={{
          ...styles.level,
          background: levelStyle.background,
          color: levelStyle.color,
        }}
      >
        {log.level}
      </span>

      <span style={styles.message}>
        {log.message}
      </span>
    </div>
  );
};

export default LogLine;

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    transition: "background .2s",
  },

  lineNumber: {
    width: 40,
    color: "#4b5563",
    fontSize: 13,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    textAlign: "right",
    userSelect: "none",
  },

  timestamp: {
    width: 80,
    color: "#9ca3af",
    fontSize: 13,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
  },

  level: {
    minWidth: 80,
    textAlign: "center",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 6,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
  },

  message: {
    flex: 1,
    color: "#f3f4f6",
    fontSize: 13,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
};