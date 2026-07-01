import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getLogsSummary,
  getMigrationLogs,
  getRepositoryAnalysisLogs,
} from "../services/logsApi";
import type { LogsSummary, MigrationLog, RepositoryAnalysisLog } from "../services/logsApi";
import { getStoredAppToken } from "../services/socialAuthApi";

type ActiveTab = "migrations" | "analysis";

type LogsState = {
  summary: LogsSummary | null;
  migrations: MigrationLog[];
  repositoryAnalysis: RepositoryAnalysisLog[];
};

const emptyLogs: LogsState = {
  summary: null,
  migrations: [],
  repositoryAnalysis: [],
};

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

function statusStyle(status?: string | null): React.CSSProperties {
  const normalized = (status || "").toLowerCase();
  if (normalized === "completed") return { background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" };
  if (normalized === "failed") return { background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" };
  if (normalized === "blocked") return { background: "#ffedd5", color: "#c2410c", borderColor: "#fed7aa" };
  if (["running", "started"].includes(normalized)) return { background: "#dbeafe", color: "#1d4ed8", borderColor: "#bfdbfe" };
  return { background: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" };
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "blue" | "green" | "red" | "orange" | "slate" }) {
  const tones: Record<string, React.CSSProperties> = {
    blue: { background: "#dbeafe", color: "#1d4ed8", borderColor: "#bfdbfe" },
    green: { background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" },
    red: { background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" },
    orange: { background: "#ffedd5", color: "#c2410c", borderColor: "#fed7aa" },
    slate: { background: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" },
  };
  return <span style={{ ...styles.badge, ...tones[tone] }}>{children}</span>;
}

function StatusBadge({ status }: { status?: string | null }) {
  return <span style={{ ...styles.badge, ...statusStyle(status), textTransform: "capitalize" }}>{status || "-"}</span>;
}

function JavaBadge({ version }: { version?: string | null }) {
  return version ? <Badge tone="blue">Java {version}</Badge> : <span style={styles.mutedBadge}>Not captured</span>;
}

function BuildToolBadge({ value }: { value?: string | null }) {
  return value ? <Badge tone="slate">{value}</Badge> : <span style={styles.muted}>-</span>;
}

function EndpointBadge({ count }: { count: number }) {
  return <Badge tone={count > 0 ? "green" : "slate"}>{count}</Badge>;
}

function CountBadge({ value, label, tone = "slate" }: { value?: number | null; label: string; tone?: "blue" | "green" | "slate" }) {
  return <Badge tone={tone}>{value ?? 0} {label}</Badge>;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function parseConversionTypes(value?: string | string[] | null) {
  if (!value) return "-";
  if (Array.isArray(value)) return value.join(", ");
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.join(", ") : value;
  } catch {
    return value;
  }
}

function getRepositoryName(name?: string | null, url?: string | null) {
  if (name) return name;
  return url?.replace(/\.git$/, "").split("/").filter(Boolean).pop() || "Repository";
}

function isRunningStatus(status?: string | null) {
  return status?.toLowerCase() === "running";
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>i</div>
      <div style={styles.emptyTitle}>{title}</div>
      <div style={styles.emptySubtitle}>{subtitle}</div>
    </div>
  );
}

function MigrationTable({ rows, statusFilter }: { rows: MigrationLog[]; statusFilter: string }) {
  const emptyTitle = statusFilter === "failed" ? "No failed migration logs found" : "No migration logs found";
  const emptySubtitle =
    statusFilter === "failed"
      ? "Failed migrations will appear here when a migration execution fails."
      : "Run a migration to see execution history here.";

  return (
    <section style={styles.tableCard}>
      <div style={styles.tableHeader}>
        <div>
          <h2 style={styles.tableTitle}>Migration Logs</h2>
          <p style={styles.tableSubtitle}>Java migration execution history for the current user.</p>
        </div>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Repository", "Source Java", "Target Java", "Conversion Types", "Status", "Started At", "Completed At", "Migrated Repo", "Error"].map((column) => (
                <th key={column} style={styles.th}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={styles.td}>
                  <div style={styles.repoName}>{getRepositoryName(row.repository_name, row.repository_url)}</div>
                  <div style={styles.repoUrl}>{row.repository_url || "Repository URL not captured"}</div>
                </td>
                <td style={styles.td}><JavaBadge version={row.source_java_version} /></td>
                <td style={styles.td}><JavaBadge version={row.target_java_version} /></td>
                <td style={styles.td}><span style={styles.wrapText}>{parseConversionTypes(row.conversion_types)}</span></td>
                <td style={styles.td}><StatusBadge status={row.status} /></td>
                <td style={styles.td}>{formatDate(row.started_at)}</td>
                <td style={styles.td}>{isRunningStatus(row.status) ? <span style={styles.muted}>In progress</span> : formatDate(row.completed_at)}</td>
                <td style={styles.td}>
                  {row.migrated_repo_url ? (
                    <a href={row.migrated_repo_url} target="_blank" rel="noreferrer" style={styles.repoButton}>Open Repo</a>
                  ) : (
                    <span style={styles.muted}>-</span>
                  )}
                </td>
                <td style={styles.td}>
                  {row.error_message ? (
                    <span title={row.error_message} style={styles.errorBadge}>{row.error_message}</span>
                  ) : (
                    <span style={styles.muted}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
      )}
    </section>
  );
}

function RepositoryAnalysisTable({ rows }: { rows: RepositoryAnalysisLog[] }) {
  return (
    <section style={styles.tableCard}>
      <div style={styles.tableHeader}>
        <div>
          <h2 style={styles.tableTitle}>Repository Analysis</h2>
          <p style={styles.tableSubtitle}>Repository scans, detected Java versions, and project metadata.</p>
        </div>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Repository", "Total Files", "Java Files", "Build Tool", "Java Version", "Spring Boot Version", "API Endpoints", "Dependency Count", "Analyzed At"].map((column) => (
                <th key={column} style={styles.th}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={styles.td}>
                  <div style={styles.repoName}>{getRepositoryName(row.repository_name, row.repository_url)}</div>
                  <div style={styles.repoUrl}>{row.repository_url || "Repository URL not captured"}</div>
                </td>
                <td style={styles.td}><CountBadge value={row.total_files} label="files" tone="slate" /></td>
                <td style={styles.td}><CountBadge value={row.java_files} label="Java" tone="blue" /></td>
                <td style={styles.td}><BuildToolBadge value={row.build_tool} /></td>
                <td style={styles.td}><JavaBadge version={row.detected_java_version} /></td>
                <td style={styles.td}>{row.detected_spring_boot_version || <span style={styles.muted}>-</span>}</td>
                <td style={styles.td}><EndpointBadge count={row.api_endpoint_count} /></td>
                <td style={styles.td}>{row.dependency_count}</td>
                <td style={styles.td}>{formatDate(row.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <EmptyState title="No repository analysis logs found" subtitle="Analyze a repository to see scan results here." />
      )}
    </section>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogsState>(emptyLogs);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("migrations");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filters = useMemo(() => ({ status, search }), [status, search]);

  const loadLogs = useCallback(async () => {
    const token = getStoredAppToken();
    if (!token) {
      setLogs(emptyLogs);
      setError("Please login to view migration logs.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [summary, migrations, repositoryAnalysis] = await Promise.all([
        getLogsSummary(token),
        getMigrationLogs(token, filters),
        getRepositoryAnalysisLogs(token, { search }),
      ]);
      console.log("Migration logs response:", migrations);
      console.log("Repository analysis response:", repositoryAnalysis);
      setLogs({ summary, migrations, repositoryAnalysis });
    } catch (error) {
      console.error("Failed to load logs", error);
      setLogs(emptyLogs);
      setError("Failed to load logs. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const hasRunning = logs.migrations.some((log) => isRunningStatus(log.status));
    if (!hasRunning) return;

    const interval = window.setInterval(() => {
      loadLogs();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadLogs, logs.migrations]);

  const resetFilters = () => {
    setStatus("all");
    setSearch("");
  };

  const summaryCards = [
    { label: "Total Migrations", value: logs.summary?.total_migrations ?? 0, helper: "All migration runs", icon: "M", tone: "#2563eb" },
    { label: "Successful Migrations", value: logs.summary?.successful_migrations ?? 0, helper: "Completed successfully", icon: "S", tone: "#16a34a" },
    { label: "Failed Migrations", value: logs.summary?.failed_migrations ?? 0, helper: "Needs attention", icon: "F", tone: "#dc2626" },
    { label: "Repository Analyses", value: logs.summary?.total_repository_analyses ?? 0, helper: "Repositories scanned", icon: "R", tone: "#475569" },
  ];

  const filteredMigrationLogs = useMemo(() => {
    return logs.migrations.filter((log) => {
      const matchesStatus =
        status === "all" || log.status?.toLowerCase() === status;

      const searchText = search.trim().toLowerCase();
      const matchesSearch =
        searchText === "" ||
        log.repository_name?.toLowerCase().includes(searchText) ||
        log.repository_url?.toLowerCase().includes(searchText) ||
        log.source_java_version?.toLowerCase().includes(searchText) ||
        log.target_java_version?.toLowerCase().includes(searchText);

      return matchesStatus && matchesSearch;
    });
  }, [logs.migrations, search, status]);

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Migration Logs Dashboard</h1>
            <p style={styles.subtitle}>Track repository analysis history and Java migration execution results.</p>
          </div>
          <button type="button" onClick={loadLogs} style={styles.refreshButton} disabled={loading}>
            Refresh Logs
          </button>
        </header>

        {loading && <div style={styles.loadingCard}>Loading migration logs...</div>}
        {error && !loading && <div style={styles.errorCard}>{error}</div>}

        {!loading && !error && (
          <>
            <section style={styles.summaryGrid}>
              {summaryCards.map((card) => (
                <div key={card.label} style={styles.summaryCard}>
                  <div style={{ ...styles.summaryIcon, color: card.tone, background: `${card.tone}14` }}>{card.icon}</div>
                  <div>
                    <div style={styles.summaryLabel}>{card.label}</div>
                    <div style={styles.summaryValue}>{card.value}</div>
                    <div style={styles.summaryHelper}>{card.helper}</div>
                  </div>
                </div>
              ))}
            </section>

            <section style={styles.filterCard}>
              <label style={styles.filterField}>
                <span style={styles.filterLabel}>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)} style={styles.select}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ ...styles.filterField, flex: "1 1 420px" }}>
                <span style={styles.filterLabel}>Search</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search repository URL, repository name, or Java version"
                  style={styles.input}
                />
              </label>
              <button type="button" onClick={resetFilters} style={styles.resetButton}>Reset</button>
            </section>

            <nav style={styles.tabs}>
              <button
                type="button"
                onClick={() => setActiveTab("migrations")}
                style={{ ...styles.tab, ...(activeTab === "migrations" ? styles.tabActive : {}) }}
              >
                Migration Logs <span style={styles.tabCount}>{logs.migrations.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("analysis")}
                style={{ ...styles.tab, ...(activeTab === "analysis" ? styles.tabActive : {}) }}
              >
                Repository Analysis <span style={styles.tabCount}>{logs.repositoryAnalysis.length}</span>
              </button>
            </nav>

            {activeTab === "migrations" ? (
              <MigrationTable rows={filteredMigrationLogs} statusFilter={status} />
            ) : (
              <RepositoryAnalysisTable rows={logs.repositoryAnalysis} />
            )}
          </>
        )}
      </div>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: { minHeight: "100vh", background: "#f8fafc", color: "#0f172a" },
  container: { maxWidth: 1280, margin: "0 auto", padding: "32px 40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 24 },
  title: { margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: 0 },
  subtitle: { margin: "8px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.5 },
  refreshButton: { border: "1px solid #1d4ed8", background: "#2563eb", color: "#fff", borderRadius: 8, padding: "11px 16px", fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 22px rgba(37, 99, 235, 0.18)" },
  loadingCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 24, color: "#475569", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)" },
  errorCard: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 18, color: "#991b1b", boxShadow: "0 12px 30px rgba(153, 27, 27, 0.06)" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 18 },
  summaryCard: { display: "flex", alignItems: "center", gap: 14, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)" },
  summaryIcon: { width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 17 },
  summaryLabel: { color: "#475569", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em" },
  summaryValue: { color: "#0f172a", fontSize: 28, fontWeight: 900, marginTop: 3 },
  summaryHelper: { color: "#64748b", fontSize: 12, marginTop: 2 },
  filterCard: { display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)", marginBottom: 18 },
  filterField: { display: "flex", flexDirection: "column", gap: 7, flex: "0 1 210px" },
  filterLabel: { color: "#475569", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" },
  select: { height: 42, border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", color: "#0f172a", padding: "0 11px", fontWeight: 650 },
  input: { height: 42, border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", color: "#0f172a", padding: "0 12px" },
  resetButton: { height: 42, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 8, padding: "0 16px", fontWeight: 800, cursor: "pointer" },
  tabs: { display: "flex", gap: 8, alignItems: "center", background: "#e2e8f0", borderRadius: 10, padding: 5, width: "fit-content", marginBottom: 18 },
  tab: { border: "none", background: "transparent", color: "#475569", borderRadius: 8, padding: "9px 13px", fontWeight: 850, cursor: "pointer" },
  tabActive: { background: "#fff", color: "#1d4ed8", boxShadow: "0 6px 14px rgba(15, 23, 42, 0.08)" },
  tabCount: { marginLeft: 6, padding: "2px 7px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontSize: 11 },
  tableCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)", overflow: "hidden" },
  tableHeader: { padding: "18px 20px", borderBottom: "1px solid #e2e8f0" },
  tableTitle: { margin: 0, fontSize: 18, fontWeight: 900 },
  tableSubtitle: { margin: "5px 0 0", color: "#64748b", fontSize: 13 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", minWidth: 1060, borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "13px 14px", color: "#64748b", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td: { padding: "14px", borderBottom: "1px solid #f1f5f9", color: "#1e293b", fontSize: 13, verticalAlign: "top" },
  repoName: { fontWeight: 900, color: "#0f172a", marginBottom: 4 },
  repoUrl: { maxWidth: 300, color: "#64748b", fontSize: 12, lineHeight: 1.4, overflowWrap: "anywhere", wordBreak: "break-word" },
  badge: { display: "inline-flex", border: "1px solid", borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" },
  wrapText: { display: "inline-block", maxWidth: 220, overflowWrap: "anywhere", wordBreak: "break-word", lineHeight: 1.4 },
  repoButton: { display: "inline-flex", alignItems: "center", borderRadius: 8, padding: "7px 10px", background: "#eff6ff", color: "#1d4ed8", textDecoration: "none", fontSize: 12, fontWeight: 900, border: "1px solid #bfdbfe" },
  errorBadge: { display: "inline-block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "1px solid #fecaca", borderRadius: 999, padding: "4px 9px", color: "#991b1b", background: "#fef2f2", fontSize: 11, fontWeight: 800 },
  muted: { color: "#94a3b8" },
  mutedBadge: { display: "inline-flex", border: "1px solid #e2e8f0", borderRadius: 999, padding: "4px 9px", color: "#64748b", background: "#f8fafc", fontSize: 11, fontWeight: 850, whiteSpace: "nowrap" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "42px 20px", borderTop: "1px solid #f1f5f9", color: "#64748b" },
  emptyIcon: { width: 34, height: 34, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "#eff6ff", color: "#1d4ed8", fontWeight: 900, marginBottom: 10 },
  emptyTitle: { color: "#0f172a", fontSize: 16, fontWeight: 900, marginBottom: 5 },
  emptySubtitle: { color: "#64748b", fontSize: 13 },
};
