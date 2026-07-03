export type LogLevel = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface LogStatisticsData {
  total: number;
  info: number;
  success: number;
  warning: number;
  error: number;
}
