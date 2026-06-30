import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { healthCheck, listMigrations, type MigrationResult } from "../../services/api";
import "./DashboardPage.css";

type HealthState = "loading" | "healthy" | "unavailable";

type Kpi = {
  title: string;
  value: string;
  text: string;
  type: string;
  icon: string;
};

type StatusCounts = {
  completed: number;
  inProgress: number;
  failed: number;
};

type ChartPoint = {
  x: number;
  y: number;
  value: number;
};

type TopJavaVersion = {
  name: string;
  value: string;
  width: number;
};

const RUNNING_STATUSES = new Set(["pending", "queued", "cloning", "analyzing", "migrating", "running", "in_progress"]);
const CHART_LEFT = 44;
const CHART_RIGHT = 516;
const CHART_TOP = 26;
const CHART_BOTTOM = 176;
const CHART_WIDTH = CHART_RIGHT - CHART_LEFT;
const CHART_HEIGHT = CHART_BOTTOM - CHART_TOP;

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getMigrationName = (migration: MigrationResult) => {
  const target = migration.target_repo || migration.source_repo || migration.job_id;
  const cleanTarget = target.split("/").filter(Boolean).pop() || target;
  return cleanTarget.replace(/\.git$/i, "") || migration.job_id;
};

const normalizeStatus = (status: string | null | undefined) => {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "completed" || normalized === "success" || normalized === "succeeded") return "completed";
  if (normalized === "failed" || normalized === "error") return "failed";
  if (RUNNING_STATUSES.has(normalized)) return "in-progress";
  return normalized ? "in-progress" : "unknown";
};

const getStatusLabel = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);
  if (normalized === "completed") return "Completed";
  if (normalized === "failed") return "Failed";
  if (normalized === "in-progress") return "In Progress";
  return "Unknown";
};

const getStatusIcon = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);
  if (normalized === "completed") return "OK";
  if (normalized === "failed") return "ERR";
  return "RUN";
};

const getStatusCounts = (migrations: MigrationResult[]): StatusCounts =>
  migrations.reduce(
    (counts, migration) => {
      const status = normalizeStatus(migration.status);
      if (status === "completed") counts.completed += 1;
      else if (status === "failed") counts.failed += 1;
      else counts.inProgress += 1;
      return counts;
    },
    { completed: 0, inProgress: 0, failed: 0 }
  );

const getMigrationTimestamp = (migration: MigrationResult) =>
  Date.parse(migration.completed_at || migration.started_at || "") || 0;

const formatRelativeTime = (timestamp: number) => {
  if (!timestamp) return "Time unavailable";

  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(timestamp).toLocaleDateString();
};

const percent = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0);

const formatDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLastSevenDays = () =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

const getDayLabels = () =>
  getLastSevenDays().map((date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  );

const buildTrendPoints = (migrations: MigrationResult[], status: "completed" | "in-progress" | "failed") => {
  const dayKeys = getLastSevenDays().map(formatDayKey);

  const counts = dayKeys.map(() => 0);

  migrations.forEach((migration) => {
    const migrationStatus = normalizeStatus(migration.status);
    if (migrationStatus !== status) return;

    const timestamp = getMigrationTimestamp(migration);
    if (!timestamp) {
      counts[counts.length - 1] += 1;
      return;
    }

    const dayIndex = dayKeys.indexOf(formatDayKey(new Date(timestamp)));
    if (dayIndex >= 0) counts[dayIndex] += 1;
  });

  return counts;
};

const buildChartPoints = (values: number[], maxValue: number): ChartPoint[] => {
  const divisor = Math.max(maxValue, 1);
  return values.map((value, index) => {
    const x = CHART_LEFT + (index * CHART_WIDTH) / Math.max(values.length - 1, 1);
    const y = CHART_TOP + CHART_HEIGHT - (value / divisor) * CHART_HEIGHT;
    return { x, y, value };
  });
};

const buildLinePath = (points: ChartPoint[]) => {
  if (!points.length) return "";
  return `M${points.map((point) => `${point.x},${point.y}`).join(" L")}`;
};

const buildAreaPath = (points: ChartPoint[]) => {
  if (!points.length) return "";
  return `${buildLinePath(points)} L${points[points.length - 1].x},${CHART_BOTTOM} L${points[0].x},${CHART_BOTTOM} Z`;
};

const getYAxisTicks = (maxValue: number) => {
  const roundedMax = Math.max(4, Math.ceil(maxValue / 2) * 2);
  return [roundedMax, Math.round(roundedMax * 0.75), Math.round(roundedMax * 0.5), Math.round(roundedMax * 0.25), 0];
};

const getTopJavaVersions = (migrations: MigrationResult[]) => {
  const counts = migrations.reduce<Record<string, number>>((acc, migration) => {
    const version = (migration.target_java_version || "").trim();
    if (!version) return acc;
    const label = version.toLowerCase().startsWith("java") ? version : `Java ${version}`;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const max = Math.max(...Object.values(counts), 0);
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([name, count]) => ({
      name,
      value: `${count} (${percent(count, migrations.length)}%)`,
      width: max > 0 ? Math.round((count / max) * 100) : 0,
    }));
};

const padTopJavaVersions = (versions: TopJavaVersion[]): TopJavaVersion[] => [
  ...versions,
  ...Array.from({ length: Math.max(0, 4 - versions.length) }, (_, index) => ({
    name: `No data ${versions.length + index + 1}`,
    value: "0 (0%)",
    width: 0,
  })),
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [migrations, setMigrations] = useState<MigrationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [health, setHealth] = useState<HealthState>("loading");

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      setLoading(true);
      setError("");

      const [migrationResult, healthResult] = await Promise.allSettled([listMigrations(), healthCheck()]);
      if (cancelled) return;

      if (migrationResult.status === "fulfilled") {
        setMigrations(Array.isArray(migrationResult.value) ? migrationResult.value : []);
      } else {
        setMigrations([]);
        setError(migrationResult.reason instanceof Error ? migrationResult.reason.message : "Unable to load migrations.");
      }

      setHealth(healthResult.status === "fulfilled" && healthResult.value.status ? "healthy" : "unavailable");
      setLastUpdated(new Date());
      setLoading(false);
    };

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  const dashboardData = useMemo(() => {
    const total = migrations.length;
    const statusCounts = getStatusCounts(migrations);
    const successRate = percent(statusCounts.completed, total);
    const dependenciesUpdated = migrations.reduce(
      (sum, migration) => sum + (migration.dependencies || []).filter((dependency) => dependency.status === "upgraded").length,
      0
    );
    const filesModified = migrations.reduce((sum, migration) => sum + numberValue(migration.files_modified), 0);
    const issuesFixed = migrations.reduce((sum, migration) => sum + numberValue(migration.issues_fixed), 0);
    const errorsFixed = migrations.reduce((sum, migration) => sum + numberValue(migration.errors_fixed), 0);
    const warnings = migrations.reduce((sum, migration) => sum + numberValue(migration.total_warnings), 0);
    const endpointsPassed = migrations.reduce((sum, migration) => sum + numberValue(migration.api_endpoints_working), 0);
    const endpointsValidated = migrations.reduce((sum, migration) => sum + numberValue(migration.api_endpoints_validated), 0);
    const recentMigrations = [...migrations]
      .sort((a, b) => getMigrationTimestamp(b) - getMigrationTimestamp(a))
      .slice(0, 5);
    const topJavaVersions = getTopJavaVersions(migrations);
    const primaryTargetVersion = topJavaVersions[0]?.name || "";
    const hasTopJavaVersions = topJavaVersions.length > 0;
    const completedTrend = buildTrendPoints(migrations, "completed");
    const inProgressTrend = buildTrendPoints(migrations, "in-progress");
    const failedTrend = buildTrendPoints(migrations, "failed");
    const maxTrendValue = Math.max(...completedTrend, ...inProgressTrend, ...failedTrend, 1);
    const yTicks = getYAxisTicks(maxTrendValue);
    const completedPoints = buildChartPoints(completedTrend, maxTrendValue);
    const inProgressPoints = buildChartPoints(inProgressTrend, maxTrendValue);
    const failedPoints = buildChartPoints(failedTrend, maxTrendValue);

    const kpis: Kpi[] = [
      { title: "Total Migrations", value: formatNumber(total), text: "All migrations returned by the app", type: "blue", icon: "TM" },
      { title: "Completed", value: formatNumber(statusCounts.completed), text: "Successful migrations", type: "green", icon: "OK" },
      { title: "In Progress", value: formatNumber(statusCounts.inProgress), text: "Currently running", type: "orange", icon: "IP" },
      { title: "Failed", value: formatNumber(statusCounts.failed), text: "Migrations failed", type: "purple", icon: "FL" },
      { title: "Success Rate", value: `${successRate}%`, text: "Completed out of total", type: "blue", icon: "SR" },
    ];

    return {
      total,
      statusCounts,
      successRate,
      dependenciesUpdated,
      filesModified,
      issuesFixed,
      errorsFixed,
      warnings,
      endpointsPassed,
      endpointsValidated,
      recentMigrations,
      topJavaVersions: padTopJavaVersions(topJavaVersions),
      hasTopJavaVersions,
      primaryTargetVersion,
      kpis,
      dayLabels: getDayLabels(),
      yTicks,
      completedPoints,
      inProgressPoints,
      failedPoints,
      completedPath: buildLinePath(completedPoints),
      inProgressPath: buildLinePath(inProgressPoints),
      failedPath: buildLinePath(failedPoints),
      completedAreaPath: buildAreaPath(completedPoints),
    };
  }, [migrations]);

  const completedPercent = percent(dashboardData.statusCounts.completed, dashboardData.total);
  const inProgressPercent = percent(dashboardData.statusCounts.inProgress, dashboardData.total);
  const failedPercent = percent(dashboardData.statusCounts.failed, dashboardData.total);
  const healthLabel = health === "loading" ? "Checking" : health === "healthy" ? "Good" : "Unavailable";
  const healthCopy =
    health === "healthy"
      ? "Backend health endpoint is responding."
      : health === "loading"
        ? "Checking backend service health."
        : "Backend health endpoint could not be reached.";

  return (
    <div className="dashboard-page">
      <main className="dashboard-main">
        <section className="dashboard-toolbar">
          <span>
            {loading
              ? "Loading migration data..."
              : lastUpdated
                ? `Last updated: ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Last updated: unavailable"}
          </span>
          <button className="primary-btn" onClick={() => navigate("/")}>
            New Migration
          </button>
        </section>

        {error && <div className="dashboard-alert">{error}</div>}

        <section className="kpi-grid">
          {dashboardData.kpis.map((kpi) => (
            <div className={`kpi-card ${kpi.type}`} key={kpi.title}>
              <div>
                <p>{kpi.title}</p>
                <h2>{loading ? "--" : kpi.value}</h2>
                <span>{kpi.text}</span>
              </div>
              <div className="kpi-side">
                <b>{kpi.icon}</b>
              </div>
            </div>
          ))}
        </section>

        <section className="dashboard-grid">
          <div className="card chart-card dashboard-reference-card">
            <div className="card-head">
              <div>
                <h3><span className="dashboard-card-icon dashboard-card-icon--blue">TR</span>Migration Trends</h3>
                <p>Migrations over time</p>
              </div>
              <button>Last 7 Days <span aria-hidden="true">v</span></button>
            </div>
            <div className="line-chart">
              <svg viewBox="0 0 540 230">
                <defs>
                  <linearGradient id="completedAreaGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {dashboardData.yTicks.map((tick, index) => {
                  const y = CHART_TOP + (index * CHART_HEIGHT) / Math.max(dashboardData.yTicks.length - 1, 1);
                  return (
                    <g key={`tick-${tick}-${index}`}>
                      <text className="chart-axis-label chart-axis-label--y" x="18" y={y + 4}>{tick}</text>
                      <line className="chart-grid-line" x1={CHART_LEFT} y1={y} x2={CHART_RIGHT} y2={y} />
                    </g>
                  );
                })}
                {dashboardData.dayLabels.map((label, index) => {
                  const x = CHART_LEFT + (index * CHART_WIDTH) / Math.max(dashboardData.dayLabels.length - 1, 1);
                  return (
                    <text className="chart-axis-label chart-axis-label--x" x={x} y="210" textAnchor="middle" key={label}>
                      {label}
                    </text>
                  );
                })}
                {dashboardData.completedAreaPath && <path className="completed-area" d={dashboardData.completedAreaPath} />}
                {dashboardData.completedPath && <path d={dashboardData.completedPath} />}
                {dashboardData.inProgressPath && <path className="orange-line" d={dashboardData.inProgressPath} />}
                {dashboardData.failedPath && <path className="red-line" d={dashboardData.failedPath} />}
                {dashboardData.completedPoints.map((point) => (
                  <circle className="chart-point chart-point--green" cx={point.x} cy={point.y} r={point.value > 0 ? 4.5 : 3} key={`completed-${point.x}`} />
                ))}
                {dashboardData.inProgressPoints.map((point) => (
                  <circle className="chart-point chart-point--orange" cx={point.x} cy={point.y} r={point.value > 0 ? 4.5 : 3} key={`running-${point.x}`} />
                ))}
                {dashboardData.failedPoints.map((point) => (
                  <circle className="chart-point chart-point--red" cx={point.x} cy={point.y} r={point.value > 0 ? 4.5 : 3} key={`failed-${point.x}`} />
                ))}
              </svg>
            </div>
            <div className="legend">
              <span className="green-dot">Completed</span>
              <span className="orange-dot">In Progress</span>
              <span className="red-dot">Failed</span>
            </div>
          </div>

          <div className="card status-card dashboard-reference-card">
            <h3>
              <span className="dashboard-card-icon dashboard-card-icon--blue" aria-hidden="true">
                <svg viewBox="0 0 16 16" focusable="false">
                  <path d="M3 3.5h10v9H3z" />
                  <path d="M6 6v4M9 5v5M12 7v3" />
                </svg>
              </span>
              Migration Status
            </h3>
            <div className="donut-wrap">
              <div
                className="donut"
                style={
                  {
                    "--completed": `${completedPercent}%`,
                    "--in-progress": `${completedPercent + inProgressPercent}%`,
                  } as CSSProperties
                }
              >
                <strong>{formatNumber(dashboardData.total)}</strong>
                <span>Total</span>
              </div>
              <div className="status-list">
                <p>
                  <b className="dot green"></b>
                  <span className="status-list__label">Completed</span>
                  <strong>
                    {formatNumber(dashboardData.statusCounts.completed)} ({completedPercent}%)
                  </strong>
                </p>
                <p>
                  <b className="dot orange"></b>
                  <span className="status-list__label">In Progress</span>
                  <strong>
                    {formatNumber(dashboardData.statusCounts.inProgress)} ({inProgressPercent}%)
                  </strong>
                </p>
                <p>
                  <b className="dot red"></b>
                  <span className="status-list__label">Failed</span>
                  <strong>
                    {formatNumber(dashboardData.statusCounts.failed)} ({failedPercent}%)
                  </strong>
                </p>
              </div>
            </div>
          </div>

          <div className="card dashboard-reference-card top-java-card">
            <h3><span className="dashboard-card-icon dashboard-card-icon--purple">JV</span>Top Java Version Migrations</h3>
            <p>Most target versions</p>
            {dashboardData.hasTopJavaVersions ? (
              dashboardData.topJavaVersions.map((version, index) => (
                <div className={`version-row${version.width === 0 ? " version-row--empty" : ""}`} key={`${version.name}-${index}`}>
                  <span className="version-rank">{index + 1}</span>
                  <div>
                    <b>{version.name}</b>
                    <div className="progress">
                      <i style={{ width: `${version.width}%` }} />
                    </div>
                  </div>
                  <strong>{version.value}</strong>
                </div>
              ))
            ) : (
              <p className="dashboard-empty">No target Java versions available yet.</p>
            )}
          </div>

          <div className="card health-card">
            <h3>Migration Health</h3>
            <div className="health-content">
              <div className="shield">{health === "healthy" ? "OK" : "!"}</div>
              <h2>{healthLabel}</h2>
              <p>{healthCopy}</p>
              <ul>
                <li>{health === "healthy" ? "Backend service operational" : "Backend status needs attention"}</li>
                <li>{dashboardData.total ? "Migration history loaded" : "No migration history available"}</li>
                <li>{dashboardData.statusCounts.failed === 0 ? "No failed migrations reported" : `${dashboardData.statusCounts.failed} failed migrations reported`}</li>
                <li>{dashboardData.endpointsValidated ? `${dashboardData.endpointsPassed}/${dashboardData.endpointsValidated} API checks passing` : "No API checks reported"}</li>
              </ul>
            </div>
          </div>

          <div className="card recent-card">
            <div className="card-head">
              <h3>Recent Migrations</h3>
            </div>
            {dashboardData.recentMigrations.length ? (
              dashboardData.recentMigrations.map((migration) => {
                const status = getStatusLabel(migration.status);
                return (
                  <div className="recent-row" key={migration.job_id}>
                    <span>{getStatusIcon(migration.status)}</span>
                    <b>{getMigrationName(migration)}</b>
                    <small>
                      Java {migration.source_java_version || "?"} to {migration.target_java_version || "?"}
                    </small>
                    <em className={normalizeStatus(migration.status)}>{status}</em>
                    <small>{formatRelativeTime(getMigrationTimestamp(migration))}</small>
                  </div>
                );
              })
            ) : (
              <p className="dashboard-empty">No migrations have been recorded yet.</p>
            )}
          </div>

          <div className="card insights-card">
            <h3>Key Insights</h3>
            <p>{dashboardData.successRate}% of migrations completed successfully</p>
            <p>{dashboardData.primaryTargetVersion || "No target Java version"} is the current top target version</p>
            <p>{formatNumber(dashboardData.dependenciesUpdated)} dependencies upgraded across completed runs</p>
            <p>{formatNumber(dashboardData.issuesFixed)} code issues fixed by migrations</p>
          </div>
        </section>

        <section className="card quality-card">
          <h3>Migration Quality Overview</h3>
          <div className="quality-grid">
            {[
              ["Files Modified", formatNumber(dashboardData.filesModified), "blue"],
              ["Code Issues Fixed", formatNumber(dashboardData.issuesFixed), "green"],
              ["Dependencies Updated", formatNumber(dashboardData.dependenciesUpdated), "orange"],
              ["API Checks Passed", `${formatNumber(dashboardData.endpointsPassed)} / ${formatNumber(dashboardData.endpointsValidated)}`, "green"],
              ["Errors Fixed", formatNumber(dashboardData.errorsFixed), "purple"],
              ["Warnings", formatNumber(dashboardData.warnings), "red"],
            ].map(([title, value, type]) => (
              <div className="quality-item" key={title}>
                <span className={type}>{title}</span>
                <strong>{loading ? "--" : value}</strong>
                <svg viewBox="0 0 120 30">
                  <polyline points="0,18 15,12 30,20 45,10 60,18 75,8 90,16 105,11 120,20" />
                </svg>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
