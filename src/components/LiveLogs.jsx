import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Button } from "@mui/material";
import { Activity, Play } from "lucide-react";

const typeClass = {
  INFO: "info",
  SUCCESS: "success",
  WARN: "warn",
  ERROR: "error",
};

const formatTimestamp = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toLocaleTimeString([], { hour12: false });
  }

  const text = String(value).trim();
  if (!text) return null;

  const match = /^\[(.+?)\]\s*(.*)$/.exec(text);
  const candidate = match?.[1] || text;
  const parsedDate = new Date(candidate);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleTimeString([], { hour12: false });
  }

  return text;
};

const normalizeLog = (line) => {
  const rawLine = typeof line === "object" && line !== null
    ? line.message || line.text || line.content || ""
    : line;
  const text = String(rawLine || "").trim();

  const match = /^\[(.+?)\]\s*(.*)$/.exec(text);
  const body = match?.[2] || text.replace(/^\[[^\]]+\]\s*/, "") || "Migration log entry";
  const detected = ["ERROR", "WARN", "SUCCESS", "INFO"].find((type) => body.toUpperCase().includes(type));

  return {
    type: detected || "INFO",
    message: body,
    timestamp: formatTimestamp(match?.[1] || null),
  };
};

const getConnectionLabel = (state) => {
  if (state === "reconnecting") return "Reconnecting...";
  if (state === "connected") return "Live";
  if (state === "completed") return "Completed";
  if (state === "disconnected") return "Disconnected";
  return "Waiting";
};

const getPlaceholderMessage = (state) => {
  if (state === "reconnecting") return "Reconnecting to migration updates...";
  if (state === "disconnected") return "Connection interrupted. Showing the latest available logs.";
  return "Waiting for migration updates...";
};

export default function LiveLogs({ backendLogs = [], connectionStatus = "connected" }) {
  const [connectionState, setConnectionState] = useState("waiting");
  const logEndRef = useRef(null);
  const hasReceivedLogsRef = useRef(false);

  const mergedLogs = useMemo(() => backendLogs.map(normalizeLog), [backendLogs]);

  useEffect(() => {
    if (!backendLogs.length) {
      setConnectionState(hasReceivedLogsRef.current ? "disconnected" : "waiting");
      return;
    }

    hasReceivedLogsRef.current = true;
    setConnectionState("connected");
  }, [backendLogs]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mergedLogs.length]);

  const derivedConnectionState = connectionStatus === "reconnecting"
    ? "reconnecting"
    : connectionStatus === "connecting"
      ? "connecting"
      : connectionStatus === "completed"
        ? "completed"
        : connectionState;

  const statusLabel = getConnectionLabel(derivedConnectionState);
  const statusIcon = derivedConnectionState === "connected" || derivedConnectionState === "reconnecting"
    ? <Play size={15} />
    : <Activity size={15} />;

  const hasLogs = mergedLogs.length > 0;

  return (
    <section className="migration-dashboard-card live-logs-card">
      <div className="migration-card-heading">
        <div>
          <h3>Live Logs</h3>
          <p>Frontend log stream for migration execution visibility.</p>
        </div>
        <Button variant="outlined" color="inherit" size="small" startIcon={statusIcon}>
          {statusLabel}
        </Button>
      </div>

      <div className="migration-terminal" role="log" aria-live="polite">
        {!hasLogs ? (
          <div className="migration-log-line">
            <span className="log-time">{new Date().toLocaleTimeString([], { hour12: false })}</span>
            <span className={`log-type ${typeClass.INFO}`}>INFO</span>
            <span>{getPlaceholderMessage(derivedConnectionState)}</span>
          </div>
        ) : (
          mergedLogs.map((log, index) => (
            <div className="migration-log-line" key={`${log.timestamp || "timestamp"}-${index}`}>
              {log.timestamp ? <span className="log-time">{log.timestamp}</span> : null}
              <span className={`log-type ${typeClass[log.type] || "info"}`}>{log.type}</span>
              <span>{log.message}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </section>
  );
}

LiveLogs.propTypes = {
  backendLogs: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
  connectionStatus: PropTypes.string,
};
