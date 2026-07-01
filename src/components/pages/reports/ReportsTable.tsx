import type { MigrationReportRecord, ReportDownloadType } from "./reportHistory";

type ReportsTableProps = {
  reports: MigrationReportRecord[];
  onView: (report: MigrationReportRecord) => void;
  onDownload: (report: MigrationReportRecord, type: ReportDownloadType) => void;
  onDelete: (reportId: string) => void;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
};

const formatStatus = (status: string) =>
  status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function ReportsTable({ reports, onView, onDownload, onDelete }: ReportsTableProps) {
  if (!reports.length) {
    return (
      <section className="reports-table-card reports-table-card--empty-filter">
        <p>No reports match the selected filters.</p>
      </section>
    );
  }

  return (
    <section className="reports-table-card" aria-label="Generated migration reports">
      <div className="reports-table-scroll">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Repository</th>
              <th>Source Java</th>
              <th>Target Java</th>
              <th>Generated Date</th>
              <th>Status</th>
              <th>Strategy</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td data-label="Repository">
                  <strong>{report.repositoryName}</strong>
                  <span>{report.migrationName}</span>
                </td>
                <td data-label="Source Java">{report.sourceJava}</td>
                <td data-label="Target Java">{report.targetJava}</td>
                <td data-label="Generated Date">{formatDate(report.generatedDate)}</td>
                <td data-label="Status">
                  <span className={`reports-status reports-status--${report.status}`}>{formatStatus(report.status)}</span>
                </td>
                <td data-label="Strategy">{report.strategy}</td>
                <td data-label="Actions">
                  <div className="reports-actions">
                    <button type="button" onClick={() => onView(report)}>View</button>
                    <button type="button" onClick={() => onDownload(report, "pdf")}>PDF</button>
                    <button type="button" onClick={() => onDownload(report, "html")}>HTML</button>
                    <button type="button" onClick={() => onDownload(report, "json")}>JSON</button>
                    <button type="button" onClick={() => onDownload(report, "excel")}>Excel</button>
                    <button type="button" onClick={() => onDownload(report, "zip")}>ZIP</button>
                    <button type="button" className="reports-actions__delete" onClick={() => onDelete(report.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
