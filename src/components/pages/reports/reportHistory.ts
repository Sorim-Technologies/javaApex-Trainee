import { API_BASE_URL, type MigrationResult } from "../../../services/api";

export const REPORT_HISTORY_STORAGE_KEY = "javapex_migration_reports";
const REPORT_DELETED_STORAGE_KEY = "javapex_deleted_report_ids";

export type ReportStatus = "completed" | "in-progress" | "failed" | "unknown";
export type ReportDownloadType = "pdf" | "html" | "json" | "excel" | "zip";

export interface GeneratedReportFile {
  type: ReportDownloadType;
  label: string;
  fileName: string;
  size: string;
}

export interface MigrationReportRecord {
  id: string;
  jobId: string;
  migrationName: string;
  repositoryName: string;
  repositoryUrl: string;
  sourceJava: string;
  targetJava: string;
  strategy: string;
  status: ReportStatus;
  generatedDate: string;
  executionTime: string;
  dependenciesUpdated: number;
  filesModified: number;
  warnings: string[];
  recommendations: string[];
  generatedFiles: GeneratedReportFile[];
  storageBytes: number;
  rawJob?: MigrationResult;
}

const fallbackText = (value: unknown, fallback = "N/A") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const parseRepositoryName = (repositoryUrl: string) => {
  const trimmed = repositoryUrl.replace(/\.git$/i, "").replace(/\/+$/, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join("/");
  return fallbackText(trimmed, "Unknown Repository");
};

const formatStrategy = (conversionTypes: string[] | undefined) => {
  if (!conversionTypes?.length) return "Automated Migration";
  return conversionTypes
    .map((conversion) =>
      conversion
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase())
    )
    .join(", ");
};

const normalizeStatus = (status: string | undefined): ReportStatus => {
  const normalized = status?.toLowerCase() || "";
  if (normalized === "completed" || normalized === "success") return "completed";
  if (normalized === "failed" || normalized === "error") return "failed";
  if (normalized) return "in-progress";
  return "unknown";
};

const formatExecutionTime = (startedAt?: string | null, completedAt?: string | null) => {
  if (!startedAt || !completedAt) return "N/A";
  const started = new Date(startedAt).getTime();
  const completed = new Date(completedAt).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started) return "N/A";
  const totalSeconds = Math.max(1, Math.round((completed - started) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

const estimateFileSize = (seed: number, multiplier: number) => {
  const bytes = Math.max(8_192, seed * multiplier);
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
};

const buildGeneratedFiles = (report: Pick<MigrationReportRecord, "repositoryName" | "storageBytes">): GeneratedReportFile[] => {
  const safeRepoName = report.repositoryName.replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "") || "migration-report";
  return [
    { type: "pdf", label: "PDF Report", fileName: `${safeRepoName}.pdf`, size: estimateFileSize(report.storageBytes, 7) },
    { type: "html", label: "HTML Report", fileName: `${safeRepoName}.html`, size: estimateFileSize(report.storageBytes, 4) },
    { type: "json", label: "JSON Metadata", fileName: `${safeRepoName}.json`, size: estimateFileSize(report.storageBytes, 1) },
    { type: "excel", label: "Excel Summary", fileName: `${safeRepoName}.csv`, size: estimateFileSize(report.storageBytes, 2) },
    { type: "zip", label: "Migrated Project ZIP", fileName: `${safeRepoName}.zip`, size: estimateFileSize(report.storageBytes, 24) },
  ];
};

export const normalizeMigrationReport = (job: MigrationResult): MigrationReportRecord => {
  const repositoryUrl = fallbackText(job.source_repo, "Unknown Repository");
  const repositoryName = parseRepositoryName(repositoryUrl);
  const generatedDate = fallbackText(job.completed_at || job.started_at, new Date().toISOString());
  const dependenciesUpdated = job.dependencies?.filter((dependency) =>
    ["upgraded", "updated", "fixed"].includes(String(dependency.status || "").toLowerCase())
  ).length || 0;
  const warningMessages = job.issues
    ?.filter((issue) => issue.severity === "warning")
    .slice(0, 6)
    .map((issue) => issue.message) || [];
  const warnings = warningMessages.length
    ? warningMessages
    : job.total_warnings > 0
      ? [`${job.total_warnings} warnings require review.`]
      : ["No blocking warnings recorded."];
  const recommendations = [
    dependenciesUpdated > 0
      ? "Review updated dependencies and run regression tests before release."
      : "Run dependency validation before promoting the migrated project.",
    job.total_errors > 0
      ? "Resolve remaining errors before production deployment."
      : "Proceed with code review and deployment readiness checks.",
    job.sonar_quality_gate
      ? `Sonar quality gate: ${job.sonar_quality_gate}.`
      : "Run code quality checks for final sign-off.",
  ];
  const baseReport = {
    id: job.job_id,
    jobId: job.job_id,
    migrationName: `${repositoryName} Java ${fallbackText(job.source_java_version)} to ${fallbackText(job.target_java_version)}`,
    repositoryName,
    repositoryUrl,
    sourceJava: fallbackText(job.source_java_version),
    targetJava: fallbackText(job.target_java_version),
    strategy: formatStrategy(job.conversion_types),
    status: normalizeStatus(job.status),
    generatedDate,
    executionTime: formatExecutionTime(job.started_at, job.completed_at),
    dependenciesUpdated,
    filesModified: Number(job.files_modified || 0),
    warnings,
    recommendations,
    storageBytes: JSON.stringify(job).length,
    rawJob: job,
  } satisfies Omit<MigrationReportRecord, "generatedFiles">;

  return {
    ...baseReport,
    generatedFiles: buildGeneratedFiles(baseReport),
  };
};

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const readDeletedReportIds = () => new Set(readJson<string[]>(REPORT_DELETED_STORAGE_KEY, []));

export const readStoredReports = () => {
  const deletedIds = readDeletedReportIds();
  return readJson<MigrationReportRecord[]>(REPORT_HISTORY_STORAGE_KEY, [])
    .filter((report) => !deletedIds.has(report.id))
    .map((report) => ({
      ...report,
      generatedFiles: report.generatedFiles?.length ? report.generatedFiles : buildGeneratedFiles(report),
    }));
};

export const saveStoredReports = (reports: MigrationReportRecord[]) => {
  const sortedReports = [...reports].sort(
    (first, second) => new Date(second.generatedDate).getTime() - new Date(first.generatedDate).getTime()
  );
  writeJson(REPORT_HISTORY_STORAGE_KEY, sortedReports);
};

export const mergeReportHistory = (storedReports: MigrationReportRecord[], incomingReports: MigrationReportRecord[]) => {
  const deletedIds = readDeletedReportIds();
  const reportMap = new Map<string, MigrationReportRecord>();
  [...storedReports, ...incomingReports].forEach((report) => {
    if (!deletedIds.has(report.id)) {
      reportMap.set(report.id, report);
    }
  });
  const reports = Array.from(reportMap.values()).sort(
    (first, second) => new Date(second.generatedDate).getTime() - new Date(first.generatedDate).getTime()
  );
  saveStoredReports(reports);
  return reports;
};

export const deleteStoredReport = (reportId: string) => {
  const deletedIds = readDeletedReportIds();
  deletedIds.add(reportId);
  writeJson(REPORT_DELETED_STORAGE_KEY, Array.from(deletedIds));
  const reports = readStoredReports().filter((report) => report.id !== reportId);
  saveStoredReports(reports);
  return reports;
};

export const getBackendDownloadUrl = (report: MigrationReportRecord, type: ReportDownloadType) => {
  if (!report.jobId) return "";
  if (type === "zip") return `${API_BASE_URL}/migration/${report.jobId}/download-zip`;
  if (type === "pdf") return `${API_BASE_URL}/migration/${report.jobId}/report`;
  return "";
};
