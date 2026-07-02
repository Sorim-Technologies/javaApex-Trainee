import { useMemo, useState, useEffect } from "react";
import type { LogEntry, LogStatisticsData } from "../components/Logs/LogsTypes";
import { parseRawLog } from "../components/Logs/LogsHelpers";
import { getMigrationLogs } from "../services/migrationService";
import type { MigrationConsoleLog } from "../services/logApi";

export const useLogs = (
  initialRawLogs: (string | MigrationConsoleLog)[] = [],
  jobId?: string
) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "INFO" | "SUCCESS" | "WARNING" | "ERROR">("ALL");
  const [autoScroll, setAutoScroll] = useState(true);

  // Sync with incoming migration logs
  useEffect(() => {
    if (initialRawLogs && initialRawLogs.length > 0) {
      setLogs(initialRawLogs.map((str, idx) => parseRawLog(str, idx)));
    } else {
      setLogs([]);
    }
  }, [initialRawLogs]);

  // Stream live logs if a jobId is provided and we aren't getting them passed down
  useEffect(() => {
    if (!jobId || (initialRawLogs && initialRawLogs.length > 0)) return;

    let cancelled = false;
    const fetchLogs = () => {
      getMigrationLogs(jobId)
        .then((data) => {
          if (cancelled) return;
          if (data && data.logs) {
            setLogs(data.logs.map((str, idx) => parseRawLog(str, idx)));
          }
        })
        .catch(() => {});
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId, initialRawLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = log.message
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "ALL" || log.level === filter;

      return matchesSearch && matchesFilter;
    });
  }, [logs, search, filter]);

  const statistics = useMemo<LogStatisticsData>(() => {
    return {
      total: logs.length,
      info: logs.filter((x) => x.level === "INFO").length,
      success: logs.filter((x) => x.level === "SUCCESS").length,
      warning: logs.filter((x) => x.level === "WARNING").length,
      error: logs.filter((x) => x.level === "ERROR").length,
    };
  }, [logs]);

  const clearLogs = () => setLogs([]);

  const toggleAutoScroll = () =>
    setAutoScroll((previous) => !previous);

  const downloadLogs = () => {
    const content = logs
      .map(
        (log) =>
          `[${log.timestamp}] [${log.level}] ${log.message}`
      )
      .join("\n");

    const blob = new Blob([content], {
      type: "text/plain",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = jobId ? `migration_log_${jobId}.txt` : "migration-logs.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return {
    logs: filteredLogs,
    search,
    filter,
    autoScroll,
    statistics,
    setSearch,
    setFilter,
    toggleAutoScroll,
    clearLogs,
    downloadLogs,
  };
};

export default useLogs;