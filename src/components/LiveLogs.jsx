import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@mui/material";
import { Play, Square } from "lucide-react";

const seedMessages = [
  ["INFO", "Starting migration process..."],
  ["INFO", "Validating repository dependencies..."],
  ["SUCCESS", "Repository validation successful"],
  ["INFO", "Analyzing codebase..."],
  ["INFO", "Applying migration rules..."],
  ["INFO", "Java version upgrade in progress..."],
  ["WARN", "Manual review may be required for selected business logic changes"],
  ["SUCCESS", "Migration process running..."],
];

const typeClass = {
  INFO: "info",
  SUCCESS: "success",
  WARN: "warn",
  ERROR: "error",
};

const normalizeLog = (line) => {
  const text = String(line || "").trim();
  const detected = ["ERROR", "WARN", "SUCCESS", "INFO"].find((type) => text.toUpperCase().includes(type));
  return {
    type: detected || "INFO",
    message: text.replace(/^\[[^\]]+\]\s*/, "") || "Migration log entry",
    timestamp: new Date().toLocaleTimeString([], { hour12: false }),
  };
};

export default function LiveLogs({ backendLogs = [] }) {
  const [simulating, setSimulating] = useState(false);
  const [logs, setLogs] = useState(() => seedMessages.slice(0, 4).map(([type, message]) => ({
    type,
    message,
    timestamp: new Date().toLocaleTimeString([], { hour12: false }),
  })));
  const logEndRef = useRef(null);
  const indexRef = useRef(4);

  const mergedLogs = useMemo(() => {
    if (!backendLogs.length) return logs;
    return [...logs, ...backendLogs.slice(-20).map(normalizeLog)];
  }, [backendLogs, logs]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mergedLogs.length]);

  useEffect(() => {
    if (!simulating) return undefined;

    const timer = window.setInterval(() => {
      setLogs((current) => {
        const [type, message] = seedMessages[indexRef.current % seedMessages.length];
        indexRef.current += 1;
        return [...current.slice(-80), {
          type,
          message,
          timestamp: new Date().toLocaleTimeString([], { hour12: false }),
        }];
      });
    }, 1400);

    return () => window.clearInterval(timer);
  }, [simulating]);

  return (
    <section className="migration-dashboard-card live-logs-card">
      <div className="migration-card-heading">
        <div>
          <h3>Live Logs</h3>
          <p>Frontend log stream for migration execution visibility.</p>
        </div>
        <Button
          variant={simulating ? "outlined" : "contained"}
          color={simulating ? "inherit" : "primary"}
          size="small"
          startIcon={simulating ? <Square size={15} /> : <Play size={15} />}
          onClick={() => setSimulating((value) => !value)}
        >
          {simulating ? "Stop" : "Start"}
        </Button>
      </div>

      <div className="migration-terminal" role="log" aria-live="polite">
        {mergedLogs.map((log, index) => (
          <div className="migration-log-line" key={`${log.timestamp}-${index}`}>
            <span className="log-time">{log.timestamp}</span>
            <span className={`log-type ${typeClass[log.type] || "info"}`}>{log.type}</span>
            <span>{log.message}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </section>
  );
}
