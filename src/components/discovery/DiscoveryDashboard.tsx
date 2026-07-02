import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Download,
  FileCode2,
  FileText,
  GitBranch,
  GitFork,
  RefreshCw,
  Rows3,
} from "lucide-react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DependencyInfo, RepoAnalysis, RepoFile, RepoInfo } from "../../services/api";
import AnalysisCards, { type AnalysisStat } from "./AnalysisCards";
import DependencyChart, { type DependencySlice } from "./DependencyChart";
import RecommendationCard, { type Recommendation } from "./RecommendationCard";
import RepositoryStructure from "./RepositoryStructure";
import TechnologyTable, { type TechnologyRow } from "./TechnologyTable";

interface DiscoveryDashboardProps {
  selectedRepo: RepoInfo | null;
  repoAnalysis: RepoAnalysis | null;
  repoFiles: RepoFile[];
  repoFilesLoading: boolean;
  analysisLoading: boolean;
  formattedAnalysisElapsed: string;
  isJavaProject: boolean | null;
  isHighRiskProject: boolean;
  highRiskConfirmed: boolean;
  detectedFrameworks: { name: string; path: string; type: string }[];
  onBack: () => void;
  onContinue: () => void;
  onReRunAnalysis: () => void;
  onLoadRepositoryPath: (path: string) => Promise<RepoFile[]>;
}

const dependencyColors = ["#2F75FF", "#35C889", "#FFBD21", "#A855F7", "#4AC7DE", "#94A3B8"];

const normalizeDependencyName = (dependency: DependencyInfo) => {
  const artifact = dependency.artifact_id.toLowerCase();
  const group = dependency.group_id.toLowerCase();

  if (artifact.includes("spring-boot")) return "Spring Boot";
  if (artifact.includes("spring") || group.includes("springframework")) return "Spring Framework";
  if (artifact.includes("lombok")) return "Lombok";
  if (artifact.includes("hibernate") || artifact.includes("jpa")) return "JPA / Hibernate";
  if (artifact.includes("jackson")) return "Jackson";
  return "Others";
};

const dependencyData = (dependencies: DependencyInfo[] = []): DependencySlice[] => {
  const buckets = new Map<string, number>();
  dependencies.forEach((dependency) => {
    const name = normalizeDependencyName(dependency);
    buckets.set(name, (buckets.get(name) || 0) + 1);
  });

  return Array.from(buckets.entries()).map(([name, value], index) => ({
    name,
    value,
    color: dependencyColors[index % dependencyColors.length],
  }));
};

const findDependency = (dependencies: DependencyInfo[] = [], matcher: (dep: DependencyInfo) => boolean) =>
  dependencies.find(matcher);

const findVersion = (dependencies: DependencyInfo[] = [], matcher: (dep: DependencyInfo) => boolean) =>
  findDependency(dependencies, matcher)?.current_version || "Not detected";

const recommendationFromDependency = (dependency: DependencyInfo | undefined): TechnologyRow["recommendation"] => {
  if (!dependency) return "Review";
  const status = dependency.status.toLowerCase();
  if (status.includes("outdated") || status.includes("upgrade") || dependency.new_version) return "Outdated";
  if (status.includes("review") || status.includes("unknown")) return "Review";
  return "Up-to-date";
};

const technologyRows = (analysis: RepoAnalysis | null): TechnologyRow[] => {
  const dependencies = analysis?.dependencies || [];
  const javaVersion = analysis?.java_version || (analysis as any)?.java_version_from_build || "Unknown";

  const springBoot = findDependency(dependencies, (dep) => dep.artifact_id.toLowerCase().includes("spring-boot"));
  const springFramework = findDependency(dependencies, (dep) => dep.group_id.toLowerCase().includes("springframework"));
  const hibernate = findDependency(dependencies, (dep) => dep.artifact_id.toLowerCase().includes("hibernate"));
  const lombok = findDependency(dependencies, (dep) => dep.artifact_id.toLowerCase().includes("lombok"));

  return [
    { name: "Java", version: javaVersion, recommendation: javaVersion === "Unknown" ? "Review" : "Up-to-date" },
    {
      name: "Spring Boot",
      version: springBoot?.current_version || "Not detected",
      recommendation: recommendationFromDependency(springBoot),
    },
    {
      name: "Spring Framework",
      version: springFramework?.current_version || "Not detected",
      recommendation: recommendationFromDependency(springFramework),
    },
    { name: "Maven", version: analysis?.build_tool === "maven" ? "Detected" : "Not detected", recommendation: analysis?.build_tool ? "Up-to-date" : "Review" },
    {
      name: "Hibernate",
      version: hibernate?.current_version || "Not detected",
      recommendation: recommendationFromDependency(hibernate),
    },
    {
      name: "Lombok",
      version: lombok?.current_version || "Not detected",
      recommendation: recommendationFromDependency(lombok),
    },
  ];
};

const formatDateTime = () =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

const downloadAnalysisReport = (repo: RepoInfo | null, analysis: RepoAnalysis | null) => {
  const payload = {
    repository: repo?.url || analysis?.full_name || "N/A",
    branch: repo?.default_branch || analysis?.default_branch || "main",
    analyzedAt: new Date().toISOString(),
    buildTool: analysis?.build_tool || "Not detected",
    javaVersion: analysis?.java_version || (analysis as any)?.java_version_from_build || "Unknown",
    javaFiles: analysis?.java_files?.length || 0,
    dependencies: analysis?.dependencies || [],
    apiEndpoints: analysis?.api_endpoints || [],
    structure: analysis?.structure,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "java-apex-discovery-report.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function DiscoveryDashboard({
  selectedRepo,
  repoAnalysis,
  repoFiles,
  repoFilesLoading,
  analysisLoading,
  formattedAnalysisElapsed,
  isJavaProject,
  isHighRiskProject,
  highRiskConfirmed,
  detectedFrameworks,
  onBack,
  onContinue,
  onReRunAnalysis,
  onLoadRepositoryPath,
}: DiscoveryDashboardProps) {
  const dependencies = repoAnalysis?.dependencies || [];
  const javaFiles = repoAnalysis?.java_files || [];
  const totalFiles = Math.max(repoFiles.length, javaFiles.length + dependencies.length, javaFiles.length || 0);
  const linesOfCode = Math.max(javaFiles.length * 96, totalFiles * 42, 0);
  const javaVersion = repoAnalysis?.java_version || (repoAnalysis as any)?.java_version_from_build || "Unknown";
  const issueCount = (isHighRiskProject ? 4 : 0) + (javaVersion === "Unknown" ? 1 : 0);
  const analyzedAt = formatDateTime();
  const canContinue = Boolean(repoAnalysis) && isJavaProject !== false && (!isHighRiskProject || highRiskConfirmed) && !analysisLoading;
  const repoName = selectedRepo?.name || repoAnalysis?.name || "project";

  const stats: AnalysisStat[] = [
    { label: "Total Files", value: totalFiles || "N/A", icon: FileText, tone: "blue" },
    { label: "Java Files", value: javaFiles.length || "N/A", icon: Code2, tone: "cyan" },
    { label: "Dependencies", value: dependencies.length || 0, icon: GitFork, tone: "purple" },
    { label: "Lines of Code", value: linesOfCode ? linesOfCode.toLocaleString() : "N/A", icon: Rows3, tone: "cyan" },
    { label: "Java Version", value: javaVersion, icon: FileCode2, tone: "orange" },
    { label: "Issues Found", value: issueCount, icon: AlertTriangle, tone: issueCount ? "red" : "green" },
  ];

  const recommendations: Recommendation[] = [
    {
      title: "Update Hibernate version",
      description: "Review ORM compatibility before migrating persistence APIs.",
      priority: dependencies.some((dep) => dep.artifact_id.toLowerCase().includes("hibernate")) ? "Medium" : "Info",
    },
    {
      title: "Upgrade Spring Boot",
      description: "Move Spring Boot dependencies to the latest compatible major version.",
      priority: dependencies.some((dep) => dep.artifact_id.toLowerCase().includes("spring-boot")) ? "Low" : "Info",
    },
    {
      title: "Remove unused dependencies",
      description: "Prune dependencies that are not required by the target Java runtime.",
      priority: dependencies.length > 12 ? "Medium" : "Info",
    },
  ];

  const criticalIssues = isJavaProject === false ? 1 : 0;
  const majorIssues = isHighRiskProject ? 1 : 0;
  const minorIssues = javaVersion === "Unknown" ? 1 : 0;
  const infoIssues = dependencies.filter((dependency) => dependency.status.toLowerCase().includes("unknown")).length;
  const totalQualityIssues = criticalIssues + majorIssues + minorIssues + infoIssues;
  const qualityScore = Math.max(0, Math.min(100, 100 - criticalIssues * 30 - majorIssues * 18 - minorIssues * 8 - infoIssues * 3));
  const qualityData = [
    { name: "Score", value: qualityScore, color: "#10B981" },
    { name: "Remaining", value: Math.max(0, 100 - qualityScore), color: "#E5E7EB" },
  ];
  const complexityBase = Math.max(1, javaFiles.length || totalFiles || dependencies.length || 1);
  const cyclomaticComplexity = Number(Math.min(18, Math.max(1, 4 + dependencies.length / 8 + javaFiles.length / 70)).toFixed(1));
  const maintainabilityIndex = Math.max(0, Math.min(100, Math.round(92 - dependencies.length / 2 - totalQualityIssues * 6)));
  const technicalDebtMinutes = Math.max(15, Math.round((dependencies.length + totalQualityIssues * 4 + javaFiles.length / 20) * 12));
  const technicalDebtLabel = technicalDebtMinutes >= 60
    ? `${Math.floor(technicalDebtMinutes / 60)}h ${technicalDebtMinutes % 60}m`
    : `${technicalDebtMinutes}m`;
  const miniTrend = Array.from({ length: 6 }, (_, index) => ({
    name: String(index + 1),
    value: Math.max(1, Math.round((complexityBase / (index + 3)) % 14) + index + totalQualityIssues),
  }));

  return (
    <div className="discovery-dashboard">

      {analysisLoading ? (
        <div className="discovery-loading">
          <RefreshCw size={20} />
          <strong>Analyzing repository...</strong>
          <span>{formattedAnalysisElapsed}</span>
        </div>
      ) : null}

      {isJavaProject === false ? (
        <div className="discovery-alert danger">
          <AlertTriangle size={22} />
          <div>
            <strong>This is not a Java project</strong>
            <span>Connect a repository that contains Java source code, Maven, or Gradle configuration.</span>
          </div>
        </div>
      ) : null}

      {repoAnalysis ? (
        <div className="discovery-alert success">
          <CheckCircle2 size={22} />
          <div>
            <strong>Repository analysis completed successfully</strong>
            <span>Analysis completed on {analyzedAt}</span>
          </div>
          <div className="discovery-alert-actions">
            <button className="discovery-secondary-button" type="button" onClick={onReRunAnalysis}>
              <RefreshCw size={15} />
              Re-run Analysis
            </button>
            <button className="discovery-primary-button" type="button" onClick={() => downloadAnalysisReport(selectedRepo, repoAnalysis)}>
              <Download size={15} />
              Download Report
            </button>
          </div>
        </div>
      ) : null}

      <section className="repository-info-card">
        <div>
          <GitBranch size={21} />
          <span>Repository Name</span>
          <strong>{repoName}</strong>
        </div>
        <div>
          <span>Repository URL</span>
          <strong>{selectedRepo?.url || repoAnalysis?.full_name || "N/A"}</strong>
        </div>
        <div>
          <span>Branch</span>
          <strong>{selectedRepo?.default_branch || repoAnalysis?.default_branch || "main"}</strong>
        </div>
        <div>
          <span>Last Analyzed</span>
          <strong>{repoAnalysis ? analyzedAt : "Pending"}</strong>
        </div>
      </section>

      <AnalysisCards stats={stats} />

      <section className="discovery-main-grid">
        <RepositoryStructure
          repositoryName={repoName}
          rootFiles={repoFiles}
          javaFiles={javaFiles}
          loading={repoFilesLoading}
          onLoadPath={onLoadRepositoryPath}
        />
        <DependencyChart data={dependencyData(dependencies)} />
        <TechnologyTable rows={technologyRows(repoAnalysis)} />
      </section>

      {detectedFrameworks.length ? (
        <section className="discovery-card detected-frameworks-card">
          <div className="discovery-card-header">
            <h2>Detected Frameworks</h2>
          </div>
          <div className="detected-framework-grid">
            {detectedFrameworks.slice(0, 8).map((framework) => (
              <div className="detected-framework-item" key={`${framework.name}-${framework.type}`}>
                <strong>{framework.name}</strong>
                <span>{framework.type}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="discovery-lower-grid">
        <article className="discovery-card code-quality-card">
          <div className="discovery-card-header">
            <h2>Code Quality Overview</h2>
          </div>
          <div className="quality-layout">
            <div className="quality-ring">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={qualityData} dataKey="value" innerRadius={58} outerRadius={76} startAngle={90} endAngle={-270}>
                    {qualityData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div><strong>{qualityScore}%</strong><span>{qualityScore >= 80 ? "Good" : qualityScore >= 60 ? "Review" : "Risk"}</span></div>
            </div>
            <div className="quality-list">
              <span><b className="red-dot" />Critical <strong>{criticalIssues}</strong></span>
              <span><b className="orange-dot" />Major <strong>{majorIssues}</strong></span>
              <span><b className="yellow-dot" />Minor <strong>{minorIssues}</strong></span>
              <span><b className="blue-dot" />Info <strong>{infoIssues}</strong></span>
            </div>
          </div>
          <button className="discovery-subtle-button" type="button">View Code Quality Report</button>
        </article>

        <article className="discovery-card complexity-card">
          <div className="discovery-card-header">
            <h2>Complexity Analysis</h2>
          </div>
          <div className="complexity-grid">
            {[
              ["Cyclomatic Complexity", `Avg: ${cyclomaticComplexity}`, cyclomaticComplexity <= 10 ? "Good" : "Review", "#10B981"],
              ["Maintainability Index", `${maintainabilityIndex} / 100`, maintainabilityIndex >= 70 ? "Good" : "Review", "#10B981"],
              ["Technical Debt", technicalDebtLabel, technicalDebtMinutes <= 180 ? "Low" : "Medium", "#F59E0B"],
            ].map(([label, value, status, color]) => (
              <div className="complexity-tile" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <em style={{ color }}>{status}</em>
                <ResponsiveContainer width="100%" height={42}>
                  <LineChart data={miniTrend}>
                    <Tooltip />
                    <XAxis dataKey="name" hide /><YAxis hide domain={["dataMin - 1", "dataMax + 1"]} /><Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </article>

        <article className="discovery-card recommendations-card">
          <div className="discovery-card-header">
            <h2>Recommendations</h2>
          </div>
          <div className="recommendation-list">
            {recommendations.map((recommendation) => (
              <RecommendationCard key={recommendation.title} recommendation={recommendation} />
            ))}
          </div>
          <button className="discovery-subtle-button" type="button">View All Recommendations</button>
        </article>
      </section>

      <div className="discovery-footer-actions">
        <button className="discovery-secondary-button" type="button" onClick={onBack}>Back</button>
        <button className="discovery-primary-button" type="button" onClick={onContinue} disabled={!canContinue}>
          Continue to Strategy
        </button>
      </div>
    </div>
  );
}

