import type { ReportDownloadType, ReportStatus } from "./reportHistory";

export type ReportStatusFilter = "all" | ReportStatus;
export type ReportTypeFilter = "all" | ReportDownloadType;

type ReportFiltersProps = {
  search: string;
  status: ReportStatusFilter;
  reportType: ReportTypeFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ReportStatusFilter) => void;
  onReportTypeChange: (value: ReportTypeFilter) => void;
};

export default function ReportFilters({
  search,
  status,
  reportType,
  onSearchChange,
  onStatusChange,
  onReportTypeChange,
}: ReportFiltersProps) {
  return (
    <section className="reports-filters" aria-label="Report filters">
      <label className="reports-filter-field reports-filter-field--search">
        <span>Search</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Repository, Java version, or date"
        />
      </label>

      <label className="reports-filter-field">
        <span>Status</span>
        <select value={status} onChange={(event) => onStatusChange(event.target.value as ReportStatusFilter)}>
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="in-progress">In Progress</option>
          <option value="failed">Failed</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>

      <label className="reports-filter-field">
        <span>Report Type</span>
        <select value={reportType} onChange={(event) => onReportTypeChange(event.target.value as ReportTypeFilter)}>
          <option value="all">All Types</option>
          <option value="pdf">PDF</option>
          <option value="html">HTML</option>
          <option value="json">JSON</option>
          <option value="excel">Excel</option>
          <option value="zip">ZIP</option>
        </select>
      </label>
    </section>
  );
}
