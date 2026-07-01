import { API_BASE_URL } from "./api";

export type LogsFilters = {
  status?: string;
  search?: string;
};

export type LogsSummary = {
  total_migrations: number;
  successful_migrations: number;
  failed_migrations: number;
  total_repository_analyses: number;
  latest_migration_status?: string | null;
};

export type MigrationLog = {
  id: number;
  repository_name?: string | null;
  repository_url?: string | null;
  source_java_version?: string | null;
  target_java_version?: string | null;
  source_spring_boot_version?: string | null;
  target_spring_boot_version?: string | null;
  conversion_types?: string | string[] | null;
  status: string;
  migrated_repo_url?: string | null;
  migrated_branch_name?: string | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
};

export type RepositoryAnalysisLog = {
  id: number;
  repository_name?: string | null;
  repository_url?: string | null;
  total_files: number;
  java_files: number;
  build_tool?: string | null;
  detected_java_version?: string | null;
  detected_spring_boot_version?: string | null;
  api_endpoint_count: number;
  dependency_count: number;
  created_at?: string | null;
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function queryString(filters: LogsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") {
    params.append("status", filters.status);
  }
  if (filters.search?.trim()) {
    params.append("search", filters.search.trim());
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

function normalizeArray<T>(data: T[] | { items?: T[]; data?: T[] } | null): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function parseLogsResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();
  const data = contentType.includes("application/json") && bodyText ? JSON.parse(bodyText) : null;

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || fallbackMessage);
  }

  return data as T;
}

export async function getLogsSummary(token: string): Promise<LogsSummary> {
  const response = await fetch(`${API_BASE_URL}/logs/summary`, { headers: authHeaders(token) });
  return parseLogsResponse<LogsSummary>(response, "Failed to load logs summary");
}

export async function getMigrationLogs(token: string, filters: LogsFilters = {}): Promise<MigrationLog[]> {
  const response = await fetch(`${API_BASE_URL}/logs/migrations${queryString(filters)}`, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(`Failed to load migration logs: ${response.status}`);
  }

  const data = await parseLogsResponse<MigrationLog[] | { items?: MigrationLog[]; data?: MigrationLog[] }>(
    response,
    "Failed to load migration logs"
  );
  return normalizeArray(data).map((item) => ({
    ...item,
    repository_url: item.repository_url ?? "",
    status: item.status ?? "running",
  }));
}

export async function getRepositoryAnalysisLogs(token: string, filters: LogsFilters = {}): Promise<RepositoryAnalysisLog[]> {
  const response = await fetch(`${API_BASE_URL}/logs/repository-analysis${queryString(filters)}`, { headers: authHeaders(token) });
  const data = await parseLogsResponse<RepositoryAnalysisLog[] | { items?: RepositoryAnalysisLog[]; data?: RepositoryAnalysisLog[] }>(
    response,
    "Failed to load repository analysis logs"
  );
  return normalizeArray(data).map((item) => ({
    ...item,
    total_files: item.total_files ?? 0,
    java_files: item.java_files ?? 0,
    api_endpoint_count: item.api_endpoint_count ?? 0,
    dependency_count: item.dependency_count ?? 0,
  }));
}
