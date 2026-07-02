import React, { useState, useEffect, useMemo } from "react";
import { styles } from "../styles";
import {
  LogsHeader,
  LogsToolbar,
  LogsConsole,
  ExecutionStatus,
  LogsActions,
  LogStatistics,
} from "../../components/Logs";
import {
  getLogsSummary,
  getMigrationLogs as getApiMigrationLogs,
  getRepositoryAnalysisLogs,
} from "../../services/logApi";
import type {
  MigrationLog,
  RepositoryAnalysisLog,
  LogsSummary,
} from "../../services/logApi";
import { getMigrationLogs as getLiveMigrationLogs, API_BASE_URL } from "../../services/migrationService";
import type { MigrationResult } from "../../types/migration";
import useLogs from "../../hooks/useLogs";
import {
  getMigrationConsoleLogs,
  type MigrationConsoleLog,
} from "../../services/logApi";

interface LogsProps {
  migrationLogs: string[];
  migrationJob: MigrationResult | null;
  setStep: (step: number) => void;
  selectedRepo?: any;
}

export default function Logs({
  migrationLogs,
  migrationJob,
  setStep,
  selectedRepo,
}: LogsProps) {
  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // API Data States
  const [migrations, setMigrations] = useState<MigrationLog[]>([]);
  const [analysisLogs, setAnalysisLogs] = useState<RepositoryAnalysisLog[]>([]);
  const [summary, setSummary] = useState<LogsSummary | null>(null);

  // Historical Selection States
  const [selectedMigration, setSelectedMigration] = useState<MigrationLog | null>(null);
 const [historicalLogs, setHistoricalLogs] = useState<MigrationConsoleLog[]>([]);

  // Other Migrations filter states
  const [historySearch, setHistorySearch] = useState<string>("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");

  const filteredMigrations = useMemo(() => {
    return migrations.filter((m) => {
      // Status filter matching
      if (historyStatusFilter !== "all") {
        const isCompleted = m.status === "completed";
        const isFailed = m.status === "failed";
        const isInProgress = !isCompleted && !isFailed;

        if (historyStatusFilter === "success" && !isCompleted) return false;
        if (historyStatusFilter === "failure" && !isFailed) return false;
        if (historyStatusFilter === "inprogress" && !isInProgress) return false;
      }

      // Search match
      if (historySearch.trim()) {
        const searchLower = historySearch.toLowerCase();
        const repoName = (m.repository_name || "").toLowerCase();
        const repoUrl = (m.repository_url || "").toLowerCase();
        const srcVer = (m.source_java_version || "").toLowerCase();
        const tgtVer = (m.target_java_version || "").toLowerCase();

        return (
          repoName.includes(searchLower) ||
          repoUrl.includes(searchLower) ||
          srcVer.includes(searchLower) ||
          tgtVer.includes(searchLower)
        );
      }

      return true;
    });
  }, [migrations, historySearch, historyStatusFilter]);

  // Token retrieval
  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem("github_token") ||
      localStorage.getItem("gitlab_token") ||
      localStorage.getItem("google_token") ||
      ""
    );
  }, []);

  // Determine if there is a live migration running
  const isLiveJobRunning = useMemo(() => {
    return !!migrationJob && !["completed", "failed"].includes(migrationJob.status);
  }, [migrationJob]);

  // Keep track of completed jobs to avoid duplicate history loads
  const [completedJobIds, setCompletedJobIds] = useState<string[]>([]);

  const loadMigrationConsoleLogs = async (migrationId: number) => {
  if (!token) return;

  try {
    const logs = await getMigrationConsoleLogs(token, migrationId);

    setHistoricalLogs(logs);
  } catch (err) {
    console.error("Failed to load migration console logs", err);
    setHistoricalLogs([]);
  }
};

  // Load API Data function
  const fetchLogsData = React.useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    Promise.all([
      getApiMigrationLogs(token),
      getRepositoryAnalysisLogs(token),
      getLogsSummary(token),
    ])
      .then(([logsData, analysisData, summaryData]) => {
        setMigrations(logsData || []);
        setAnalysisLogs(analysisData || []);
        setSummary(summaryData || null);

        // Default selection: select first item if present
        if (logsData && logsData.length > 0) {
  let selected: MigrationLog;

  if (migrationJob) {
    const match = logsData.find(
      (m) =>
        m.id.toString() === migrationJob.job_id ||
        m.repository_url === migrationJob.source_repo
    );

    selected = match || logsData[0];
  } else {
    selected = logsData[0];
  }

  setSelectedMigration(selected);

  // Load console logs for the selected migration
  loadMigrationConsoleLogs(selected.id);
}
      })
      .catch((err) => {
        setError(err?.message || "Failed to load historical migration logs and statistics.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, migrationJob]);

  // Load API Data on Mount
  useEffect(() => {
    fetchLogsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Refresh historical logs list once when a running migration job completes
  useEffect(() => {
    if (migrationJob && ["completed", "failed"].includes(migrationJob.status)) {
      const jobId = migrationJob.job_id;
      if (!completedJobIds.includes(jobId)) {
        setCompletedJobIds((prev) => [...prev, jobId]);
        fetchLogsData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [migrationJob?.status]);

  // Fetch logs of the selected historical migration
  useEffect(() => {
  if (isLiveJobRunning || !selectedMigration || !token) {
    setHistoricalLogs([]);
    return;
  }

  let active = true;

  const fetchConsoleLogs = async () => {
    try {
      const logs = await getMigrationConsoleLogs(
        token,
        selectedMigration.id
      );

      if (active) {
        setHistoricalLogs(logs);
      }
    } catch (err) {
      console.error("Failed to load migration console logs", err);

      if (active) {
        setHistoricalLogs([]);
      }
    }
  };

  fetchConsoleLogs();

  return () => {
    active = false;
  };
}, [selectedMigration, isLiveJobRunning, token]);

  // Hook for filtering, statistics and downloading
  const {
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
  } = useLogs(
    isLiveJobRunning ? migrationLogs : historicalLogs,
    isLiveJobRunning ? migrationJob?.job_id : undefined
  );

  // Map selected historical migration to MigrationResult format
  const activeJob = useMemo<MigrationResult | null>(() => {
    if (isLiveJobRunning && migrationJob) {
      return migrationJob;
    }

    if (selectedMigration) {
      return {
        job_id: selectedMigration.id.toString(),
        status: selectedMigration.status,
        current_step:
          selectedMigration.status === "completed"
            ? "Completed"
            : selectedMigration.status === "failed"
            ? "Failed"
            : "Processing",
        progress_percent:
          selectedMigration.status === "completed"
            ? 100
            : selectedMigration.status === "failed"
            ? 100
            : 50,
        files_modified: 0,
        error_message: selectedMigration.error_message || null,
        started_at: selectedMigration.started_at || "",
        completed_at: selectedMigration.completed_at || null,
        source_repo: selectedMigration.repository_url || selectedMigration.repository_name || "",
        target_repo: selectedMigration.migrated_repo_url || null,
        source_java_version: selectedMigration.source_java_version || "8",
        target_java_version: selectedMigration.target_java_version || "17",
        conversion_types: Array.isArray(selectedMigration.conversion_types)
          ? selectedMigration.conversion_types
          : selectedMigration.conversion_types
          ? [selectedMigration.conversion_types]
          : [],
        dependencies: [],
        issues_fixed: 0,
        api_endpoints_validated: 0,
        api_endpoints_working: 0,
        sonar_quality_gate: null,
        sonar_bugs: 0,
        sonar_vulnerabilities: 0,
        sonar_code_smells: 0,
        sonar_coverage: 0,
        migration_log: historicalLogs,
        issues: [],
        total_errors: 0,
        total_warnings: 0,
        errors_fixed: 0,
        warnings_fixed: 0,
      };
    }

    return migrationJob;
  }, [migrationJob, selectedMigration, historicalLogs, isLiveJobRunning]);

  // Find matching repository analysis log for the selected migration
  const selectedAnalysis = useMemo<RepositoryAnalysisLog | null>(() => {
    if (!selectedMigration || !analysisLogs) return null;
    return (
      analysisLogs.find(
        (log) =>
          (log.repository_url && log.repository_url === selectedMigration.repository_url) ||
          (log.repository_name && log.repository_name === selectedMigration.repository_name)
      ) || null
    );
  }, [selectedMigration, analysisLogs]);

  // Download Report Action
  const handleDownloadReport = () => {
    if (!activeJob || !activeJob.job_id) return;
    const reportUrl = `${API_BASE_URL}/migration/${activeJob.job_id}/report`;
    window.open(reportUrl, "_blank");
  };

  // Navigation handlers
  const handleBack = () => {
    setStep(5);
  };

  const handleGoToReport = () => {
    if (migrationJob && activeJob && activeJob.job_id === migrationJob.job_id) {
      setStep(7);
    }
  };

  const isGoToReportDisabled = useMemo(() => {
    if (!activeJob || !["completed", "failed"].includes(activeJob.status)) return true;
    if (!migrationJob || activeJob.job_id !== migrationJob.job_id) return true;
    return false;
  }, [activeJob, migrationJob]);

  const isDownloadReportDisabled = useMemo(() => {
    return !activeJob || activeJob.status !== "completed";
  }, [activeJob]);

  // Render Loader State
  if (loading && !isLiveJobRunning) {
    return (
      <div style={styles.card}>
        <LogsHeader />
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <span>Loading historical logs and statistics...</span>
        </div>
      </div>
    );
  }

  // Render Error State
  if (error && !isLiveJobRunning) {
    return (
      <div style={styles.card}>
        <LogsHeader />
        <div style={{ ...styles.errorBox, marginTop: 20 }}>
          <strong>Error loading logs:</strong> {error}
          <button
            style={{ ...styles.secondaryBtn, display: "block", marginTop: 16 }}
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render main layout
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
      <div style={styles.card}>
        <LogsHeader />
      </div>

      {/* Migration History (Others) Grid List */}
      <div style={styles.card}>
        <h3 style={{ ...styles.sectionTitle, marginTop: 0, marginBottom: 20 }}>📋 Migration History </h3>
        
        {/* Search & Filters */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
          <input
            type="text"
            placeholder="🔍 Search by repository name or Java version..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            style={{
              flex: "1 1 300px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
              fontSize: "14px",
              outline: "none",
              transition: "border-color 0.2s"
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All" },
              { id: "success", label: "Success" },
              { id: "failure", label: "Failure" },
              { id: "inprogress", label: "In Progress" }
            ].map((tab) => {
              const isActive = historyStatusFilter === tab.id;
              let activeColor = "var(--primary)";
              let activeBg = "rgba(59, 130, 246, 0.1)";
              if (tab.id === "success") {
                activeColor = "#10b981";
                activeBg = "rgba(16, 185, 129, 0.1)";
              } else if (tab.id === "failure") {
                activeColor = "#ef4444";
                activeBg = "rgba(239, 68, 68, 0.1)";
              }
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setHistoryStatusFilter(tab.id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: isActive ? activeColor : "var(--border)",
                    background: isActive ? activeBg : "transparent",
                    color: isActive ? activeColor : "var(--muted-foreground)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List Grid */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div style={styles.spinner} />
          </div>
        ) : filteredMigrations.length === 0 ? (
          <div style={{ ...styles.emptyText, padding: "40px 0" }}>No migrations match the selected criteria.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {filteredMigrations.map((m) => {
              const isSelected = selectedMigration && selectedMigration.id === m.id;
              const isCompleted = m.status === "completed";
              const isFailed = m.status === "failed";
              
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMigration(m)}
                  style={{
                    ...styles.repoItem,
                    borderColor: isSelected ? "var(--primary)" : "var(--border)",
                    background: isSelected ? "rgba(59, 130, 246, 0.04)" : "var(--card)",
                    boxShadow: isSelected ? "0 8px 24px rgba(37,99,235,0.08)" : styles.repoItem.boxShadow,
                    cursor: "pointer",
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 12,
                    padding: 16
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ ...styles.repoIcon, color: isSelected ? "var(--primary)" : "var(--muted-foreground)", margin: 0 }}>
                      📁
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...styles.repoName, color: isSelected ? "var(--primary)" : "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.repository_name || "Unnamed Repo"}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={m.repository_url || ""}>
                        {m.repository_url || "No URL"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 10, padding: "2px 6px", background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)", borderRadius: 4, fontWeight: 600 }}>
                      {m.source_java_version || "?"} → {m.target_java_version || "?"}
                    </span>
                    <span
                      style={{
                        ...styles.stepStatusPill,
                        color: isCompleted ? "#10b981" : isFailed ? "#ef4444" : "#3b82f6",
                        borderColor: isCompleted ? "#10b981" : isFailed ? "#ef4444" : "#3b82f6",
                        fontSize: 10,
                        padding: "2px 8px"
                      }}
                    >
                      {m.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isLiveJobRunning && activeJob ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Active Migration Status & Stats */}
          <div style={styles.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Active Migration Progress</h3>
            </div>
            <ExecutionStatus migrationJob={activeJob} />
            <LogStatistics statistics={statistics} />
          </div>

          {/* Active Logs Console */}
          <div style={styles.card}>
            <LogsToolbar
              search={search}
              filter={filter}
              autoScroll={autoScroll}
              onSearchChange={setSearch}
              onFilterChange={setFilter}
              onToggleAutoScroll={toggleAutoScroll}
              onDownload={downloadLogs}
              onClear={clearLogs}
            />
            <LogsConsole logs={filteredLogs} autoScroll={autoScroll} />
            <LogsActions
              onBack={handleBack}
              onDownloadLogs={downloadLogs}
              onDownloadReport={handleDownloadReport}
              onGoToReport={handleGoToReport}
              isDownloadReportDisabled={isDownloadReportDisabled}
              isGoToReportDisabled={isGoToReportDisabled}
            />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Dashboard Summary Statistics */}
          {summary && (
            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <div style={styles.statValue}>{summary.total_migrations}</div>
                <div style={styles.statLabel}>Total Migrations</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statValue, color: "#10b981" }}>{summary.successful_migrations}</div>
                <div style={styles.statLabel}>Successful Migrations</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statValue, color: "#ef4444" }}>{summary.failed_migrations}</div>
                <div style={styles.statLabel}>Failed Migrations</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statValue, color: "#3b82f6" }}>{summary.total_repository_analyses}</div>
                <div style={styles.statLabel}>Total Analyses</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statValue, color: "#f59e0b", fontSize: 16, paddingTop: 10, paddingBottom: 10, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {summary.latest_migration_status?.toUpperCase() || "UNKNOWN"}
                </div>
                <div style={styles.statLabel}>Latest Status</div>
              </div>
            </div>
          )}

          {activeJob ? (
            <>
              {/* Selected Repository Migration Details */}
              <div style={styles.card}>
                <h3 style={{ ...styles.sectionTitle, marginTop: 0 }}>📋 Repository Details</h3>
                <div style={styles.reportGrid}>
                  <div style={styles.reportItem}>
                    <span style={styles.reportLabel}>Repository URL</span>
                    <span style={styles.reportValue}>
                      {activeJob.source_repo ? (
                        <a
                          href={activeJob.source_repo}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.link}
                        >
                          {activeJob.source_repo}
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </span>
                  </div>
                  <div style={styles.reportItem}>
                    <span style={styles.reportLabel}>Java Upgrade Path</span>
                    <span style={styles.reportValue}>
                      Java {activeJob.source_java_version || "N/A"} → Java {activeJob.target_java_version || "N/A"}
                    </span>
                  </div>
                  <div style={styles.reportItem}>
                    <span style={styles.reportLabel}>Spring Boot Upgrade Path</span>
                    <span style={styles.reportValue}>
                      {selectedMigration?.source_spring_boot_version || "N/A"} → {selectedMigration?.target_spring_boot_version || "N/A"}
                    </span>
                  </div>
                  <div style={styles.reportItem}>
                    <span style={styles.reportLabel}>Started At</span>
                    <span style={styles.reportValue}>
                      {activeJob.started_at ? new Date(activeJob.started_at).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div style={styles.reportItem}>
                    <span style={styles.reportLabel}>Completed At</span>
                    <span style={styles.reportValue}>
                      {activeJob.completed_at ? new Date(activeJob.completed_at).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  {activeJob.target_repo && (
                    <div style={styles.reportItem}>
                      <span style={styles.reportLabel}>Migrated Repository URL</span>
                      <span style={styles.reportValue}>
                        <a
                          href={activeJob.target_repo}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.link}
                        >
                          {activeJob.target_repo}
                        </a>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Repository Analysis Metadata Card */}
              {selectedAnalysis && (
                <div style={styles.card}>
                  <h3 style={{ ...styles.sectionTitle, marginTop: 0 }}>📊 Repository Analysis Summary</h3>
                  <div style={styles.reportGrid}>
                    <div style={styles.reportItem}>
                      <span style={styles.reportLabel}>Build Tool</span>
                      <span style={{ ...styles.reportValue, textTransform: "capitalize" }}>
                        {selectedAnalysis.build_tool || "Unknown"}
                      </span>
                    </div>
                    <div style={styles.reportItem}>
                      <span style={styles.reportLabel}>Detected Java Version</span>
                      <span style={styles.reportValue}>
                        Java {selectedAnalysis.detected_java_version || "Unknown"}
                      </span>
                    </div>
                    <div style={styles.reportItem}>
                      <span style={styles.reportLabel}>Total Files</span>
                      <span style={styles.reportValue}>
                        {selectedAnalysis.total_files} ({selectedAnalysis.java_files} Java)
                      </span>
                    </div>
                    <div style={styles.reportItem}>
                      <span style={styles.reportLabel}>Dependencies Count</span>
                      <span style={styles.reportValue}>
                        {selectedAnalysis.dependency_count}
                      </span>
                    </div>
                    <div style={styles.reportItem}>
                      <span style={styles.reportLabel}>API Endpoints</span>
                      <span style={styles.reportValue}>
                        {selectedAnalysis.api_endpoint_count}
                      </span>
                    </div>
                    <div style={styles.reportItem}>
                      <span style={styles.reportLabel}>Spring Boot Version</span>
                      <span style={styles.reportValue}>
                        {selectedAnalysis.detected_spring_boot_version || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Migration Execution Status & Progress Card */}
              <div style={styles.card}>
                <h3 style={{ ...styles.sectionTitle, marginTop: 0 }}>⚙️ Execution Details</h3>
                <ExecutionStatus migrationJob={activeJob} />
                <LogStatistics statistics={statistics} />
              </div>

              {/* Selected Migration Logs Console */}
              <div style={styles.card}>
                <LogsToolbar
                  search={search}
                  filter={filter}
                  autoScroll={autoScroll}
                  onSearchChange={setSearch}
                  onFilterChange={setFilter}
                  onToggleAutoScroll={toggleAutoScroll}
                  onDownload={downloadLogs}
                  onClear={clearLogs}
                />
                <LogsConsole logs={filteredLogs} autoScroll={autoScroll} />
                <LogsActions
                  onBack={handleBack}
                  onDownloadLogs={downloadLogs}
                  onDownloadReport={handleDownloadReport}
                  onGoToReport={handleGoToReport}
                  isDownloadReportDisabled={isDownloadReportDisabled}
                  isGoToReportDisabled={isGoToReportDisabled}
                />
              </div>
            </>
          ) : (
            <div style={styles.card}>
              <div style={styles.emptyText}>Select a repository from history to view migration details.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
