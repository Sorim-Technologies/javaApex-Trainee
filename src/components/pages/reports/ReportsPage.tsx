import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listMigrations } from "../../../services/api";
import ReportDetailsModal from "./ReportDetailsModal";
import ReportFilters, { type ReportStatusFilter, type ReportTypeFilter } from "./ReportFilters";
import ReportSummaryCards from "./ReportSummaryCards";
import ReportsTable from "./ReportsTable";
import {
  deleteStoredReport,
  getBackendDownloadUrl,
  mergeReportHistory,
  normalizeMigrationReport,
  readStoredReports,
  type MigrationReportRecord,
  type ReportDownloadType,
} from "./reportHistory";
import "../Pages.css";
import "./ReportsPage.css";

const formatStorageUsed = (reports: MigrationReportRecord[]) => {
  const bytes = reports.reduce((total, report) => total + (report.storageBytes || JSON.stringify(report).length), 0);
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(0, Math.round(bytes / 1024))} KB`;
};

const createDownload = (content: string, fileName: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const toHtmlReport = (report: MigrationReportRecord) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${report.migrationName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
    h1 { margin-bottom: 6px; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    td, th { border: 1px solid #dbe4f0; padding: 10px; text-align: left; }
  </style>
</head>
<body>
  <h1>${report.migrationName}</h1>
  <p>${report.repositoryName} migrated from Java ${report.sourceJava} to Java ${report.targetJava}.</p>
  <table>
    <tbody>
      <tr><th>Status</th><td>${report.status}</td></tr>
      <tr><th>Strategy</th><td>${report.strategy}</td></tr>
      <tr><th>Generated Date</th><td>${new Date(report.generatedDate).toLocaleString()}</td></tr>
      <tr><th>Dependencies Updated</th><td>${report.dependenciesUpdated}</td></tr>
      <tr><th>Files Modified</th><td>${report.filesModified}</td></tr>
      <tr><th>Execution Time</th><td>${report.executionTime}</td></tr>
    </tbody>
  </table>
</body>
</html>`;

const toCsvReport = (report: MigrationReportRecord) => [
  ["Migration Name", "Repository", "Source Java", "Target Java", "Status", "Strategy", "Generated Date", "Dependencies Updated", "Files Modified", "Execution Time"],
  [
    report.migrationName,
    report.repositoryName,
    report.sourceJava,
    report.targetJava,
    report.status,
    report.strategy,
    new Date(report.generatedDate).toLocaleString(),
    String(report.dependenciesUpdated),
    String(report.filesModified),
    report.executionTime,
  ],
].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");

export default function ReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<MigrationReportRecord[]>(() => readStoredReports());
  const [selectedReport, setSelectedReport] = useState<MigrationReportRecord | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>("all");
  const [reportTypeFilter, setReportTypeFilter] = useState<ReportTypeFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const storedReports = readStoredReports();
    setReports(storedReports);

    listMigrations()
      .then((migrationJobs) => {
        if (cancelled) return;
        const generatedReports = migrationJobs
          .filter((job) => job.status === "completed" || Boolean(job.completed_at))
          .map(normalizeMigrationReport);
        setReports(mergeReportHistory(storedReports, generatedReports));
        setError("");
      })
      .catch(() => {
        if (!cancelled) {
          setError("Showing locally stored reports. Backend report history is unavailable.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch = !normalizedSearch || [
        report.repositoryName,
        report.migrationName,
        report.sourceJava,
        report.targetJava,
        report.strategy,
        new Date(report.generatedDate).toLocaleDateString(),
        new Date(report.generatedDate).toLocaleString(),
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      const matchesType = reportTypeFilter === "all" || report.generatedFiles.some((file) => file.type === reportTypeFilter);
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reportTypeFilter, reports, search, statusFilter]);

  const handleDelete = (reportId: string) => {
    const nextReports = deleteStoredReport(reportId);
    setReports(nextReports);
    setSelectedReport((current) => current?.id === reportId ? null : current);
  };

  const handleDownload = (report: MigrationReportRecord, type: ReportDownloadType) => {
    const backendUrl = getBackendDownloadUrl(report, type);
    if (backendUrl) {
      window.open(backendUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const file = report.generatedFiles.find((generatedFile) => generatedFile.type === type);
    const fileName = file?.fileName || `${report.repositoryName.replace(/[^\w.-]+/g, "-")}.${type}`;

    if (type === "html") {
      createDownload(toHtmlReport(report), fileName, "text/html;charset=utf-8");
      return;
    }

    if (type === "excel") {
      createDownload(toCsvReport(report), fileName, "text/csv;charset=utf-8");
      return;
    }

    createDownload(JSON.stringify(report.rawJob || report, null, 2), fileName, "application/json;charset=utf-8");
  };

  const hasReports = reports.length > 0;

  return (
    <div className="reports-page">
      <section className="reports-page__header">
        <div>
          <span className="reports-page__eyebrow">Reports Center</span>
          <h1>Migration Reports</h1>
          <p>View and download previously generated migration reports.</p>
        </div>
        <button type="button" onClick={() => navigate("/migration")}>Go to Migration</button>
      </section>

      {error && <div className="reports-page__notice">{error}</div>}

      {!hasReports && !loading ? (
        <section className="reports-empty-state">
          <div className="reports-empty-state__icon">R</div>
          <h2>No Reports Generated Yet</h2>
          <p>Complete a migration to generate reports.</p>
          <button type="button" onClick={() => navigate("/migration")}>Go to Migration</button>
        </section>
      ) : (
        <>
          <ReportSummaryCards reports={reports} storageUsed={formatStorageUsed(reports)} />
          <ReportFilters
            search={search}
            status={statusFilter}
            reportType={reportTypeFilter}
            onSearchChange={setSearch}
            onStatusChange={setStatusFilter}
            onReportTypeChange={setReportTypeFilter}
          />
          {loading ? (
            <section className="reports-table-card reports-table-card--loading">
              <p>Loading report history...</p>
            </section>
          ) : (
            <ReportsTable
              reports={filteredReports}
              onView={setSelectedReport}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
