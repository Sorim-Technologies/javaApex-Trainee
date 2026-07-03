import React, { useEffect, useRef } from "react";
import type { LogEntry } from "./LogsTypes";
import LogLine from "./LogLine";

interface LogsConsoleProps {
  logs: LogEntry[];
  autoScroll: boolean;
}

export const LogsConsole: React.FC<LogsConsoleProps> = ({
  logs,
  autoScroll,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [logs, autoScroll]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Migration Console</span>
        <span style={styles.status}>● Live</span>
      </div>

      <div style={styles.console}>
        {logs.length === 0 ? (
          <div style={styles.empty}>No logs available.</div>
        ) : (
          logs.map((log, index) => (
            <LogLine
              key={log.id}
              log={log}
              index={index}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LogsConsole;

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-sm)",
  },

  header: {
    background: "#1f2937",
    color: "#fff",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontWeight: 600,
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
  },

  status: {
    color: "#22c55e",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },

  console: {
    background: "#111827",
    color: "#fff",
    height: 480,
    overflowY: "auto",
    padding: 16,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
  },

  empty: {
    color: "#9ca3af",
    textAlign: "center",
    padding: 60,
    fontSize: 14,
  },
};