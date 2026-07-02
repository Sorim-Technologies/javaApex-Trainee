import type { LogEntry, LogLevel } from "./LogsTypes";

export const parseRawLog = (logStr: string, index: number): LogEntry => {
  let level: LogLevel = "INFO";
  let message = logStr;
  let timestamp = new Date().toLocaleTimeString();

  const levelMatch = logStr.match(/\[(INFO|SUCCESS|WARNING|ERROR)\]/i);
  if (levelMatch) {
    level = levelMatch[1].toUpperCase() as LogLevel;
    message = logStr.replace(levelMatch[0], "").trim();
  } else {
    if (/success|complete|done/i.test(logStr)) level = "SUCCESS";
    else if (/warn/i.test(logStr)) level = "WARNING";
    else if (/error|fail/i.test(logStr)) level = "ERROR";
  }

  const timeMatch = logStr.match(/(\d{2}:\d{2}:\d{2})/);
  if (timeMatch) {
    timestamp = timeMatch[1];
    message = message.replace(timeMatch[0], "").trim();
  }

  message = message.replace(/^[:\-\s]+/, "").trim();

  return {
    id: index + 1,
    timestamp,
    level,
    message,
  };
};
