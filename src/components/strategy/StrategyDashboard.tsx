import { Chip } from "@mui/material";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Hammer,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  TestTube2,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type {
  JavaVersionRecommendationResponse,
  RepoAnalysis,
  RepoInfo,
} from "../../services/api";

interface JavaVersionOption {
  value: string;
  label: string;
}

interface MigrationApproachOption {
  value: string;
  label: string;
  desc: string;
  tooltip: string;
  icon: string;
  color: string;
}

interface StrategyDashboardProps {
  repoAnalysis: RepoAnalysis | null;
  selectedRepo: RepoInfo | null;
  selectedSourceVersion: string;
  selectedTargetVersion: string;
  userSelectedVersion: string | null;
  availableTargetVersions: JavaVersionOption[];
  migrationApproach: string;
  migrationApproachOptions: MigrationApproachOption[];
  targetRepoName: string;
  targetRepoTimestamp: string;
  riskLevel: string;
  versionRecommendation: JavaVersionRecommendationResponse | null;
  versionRecommendationLoading: boolean;
  versionRecommendationError: string;
  onSourceVersionChange: (value: string) => void;
  onTargetVersionChange: (value: string) => void;
  onMigrationApproachChange: (value: string) => void;
  onTargetRepoNameChange: (value: string) => void;
  onUseRecommendation: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  buildTargetRepoUrl: (repoName: string, timestamp: string) => string;
  buildTargetBranchName: (repoName: string, timestamp: string) => string;
}

const effortData = [
  { name: "Code Changes", value: 45, color: "#2563EB" },
  { name: "Dependency Updates", value: 30, color: "#22C55E" },
  { name: "Testing", value: 20, color: "#FACC15" },
  { name: "Configuration", value: 15, color: "#A855F7" },
  { name: "Documentation", value: 10, color: "#EC4899" },
];

const riskData = [
  { name: "High Risk", value: 3, color: "#EF4444" },
  { name: "Medium Risk", value: 5, color: "#FACC15" },
  { name: "Low Risk", value: 4, color: "#22C55E" },
];

const downloadReport = (
  format: "pdf" | "xlsx" | "json",
  repoAnalysis: RepoAnalysis | null,
  selectedTargetVersion: string,
  migrationApproach: string
) => {
  const payload = {
    buildTool: repoAnalysis?.build_tool || "Not detected",
    sourceJavaVersion: repoAnalysis?.java_version || "Unknown",
    targetJavaVersion: selectedTargetVersion || "Not selected",
    migrationApproach,
    dependencies: repoAnalysis?.dependencies || [],
    risk: repoAnalysis ? "Calculated" : "Pending",
    generatedAt: new Date().toISOString(),
  };

  const content = format === "json"
    ? JSON.stringify(payload, null, 2)
    : [
        "Metric,Value",
        `Build Tool,${payload.buildTool}`,
        `Source Java Version,${payload.sourceJavaVersion}`,
        `Target Java Version,${payload.targetJavaVersion}`,
        `Migration Approach,${payload.migrationApproach}`,
        `Dependencies,${payload.dependencies.length}`,
      ].join("\n");

  const blob = new Blob([content], {
    type: format === "json" ? "application/json" : "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `java-apex-strategy-report.${format === "xlsx" ? "csv" : format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function StrategyDashboard({
  repoAnalysis,
  selectedRepo,
  selectedSourceVersion,
  selectedTargetVersion,
  userSelectedVersion,
  availableTargetVersions,
  migrationApproach,
  migrationApproachOptions,
  targetRepoName,
  targetRepoTimestamp,
  riskLevel,
  versionRecommendation,
  versionRecommendationLoading,
  versionRecommendationError,
  onSourceVersionChange,
  onTargetVersionChange,
  onMigrationApproachChange,
  onTargetRepoNameChange,
  onUseRecommendation,
  onBack,
  onContinue,
  buildTargetRepoUrl,
  buildTargetBranchName,
}: StrategyDashboardProps) {
  const dependenciesCount = repoAnalysis?.dependencies?.length || 0;
  const detectedJavaVersion = repoAnalysis?.java_version || (repoAnalysis as any)?.java_version_from_build || "";
  const sourceNeedsSelection = !userSelectedVersion && (!detectedJavaVersion || detectedJavaVersion === "unknown");
  const selectedApproach = migrationApproachOptions.find((option) => option.value === migrationApproach);
  const duration = dependenciesCount > 20 || riskLevel === "high" ? "6 - 8 Weeks" : riskLevel === "low" ? "2 - 4 Weeks" : "4 - 6 Weeks";
  const effort = riskLevel === "high" ? "High" : riskLevel === "low" ? "Low" : "Medium";
  const riskLabel = riskLevel ? riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) : "Medium";
  const breakingChanges = Math.max(3, Math.ceil(dependenciesCount / 3));
  const jakartaDetected = repoAnalysis?.dependencies?.some((dep) =>
    `${dep.group_id}:${dep.artifact_id}`.toLowerCase().includes("jakarta")
  );
  const targetRepoPlaceholder = migrationApproach === "branch"
    ? buildTargetBranchName(selectedRepo?.name || "repo", targetRepoTimestamp)
    : buildTargetRepoUrl(selectedRepo?.name || "repo", targetRepoTimestamp);

  const summaryCards = [
    { label: "Build Tool", value: repoAnalysis?.build_tool || "Not Detected", icon: Hammer, tone: "blue" },
    { label: "Java Version", value: selectedTargetVersion ? `Java ${selectedTargetVersion}` : "Select target", icon: Code2, tone: "red" },
    { label: "Jakarta EE", value: jakartaDetected ? "Yes" : "No", icon: PackageCheck, tone: "green" },
    { label: "Dependencies", value: `${dependenciesCount} Found`, icon: Code2, tone: "cyan" },
    { label: "Migration Effort", value: effort, icon: ShieldAlert, tone: "yellow" },
    { label: "Estimated Duration", value: duration, icon: Clock, tone: "orange" },
  ];

  const recommendations = [
    {
      title: "Update Spring Framework to latest compatible version",
      description: "Improves performance and security before Java runtime upgrade.",
      priority: dependenciesCount > 0 ? "High" : "Medium",
    },
    {
      title: "Replace deprecated Java APIs",
      description: "Some APIs may be removed or strongly discouraged in modern Java.",
      priority: "Medium",
    },
    {
      title: "Update Maven plugins",
      description: "Ensure plugin compatibility with the selected target Java version.",
      priority: "Medium",
    },
    {
      title: "Remove unused dependencies",
      description: `Found ${Math.max(1, Math.floor(dependenciesCount / 4))} candidates for dependency cleanup.`,
      priority: "Low",
    },
  ];

  const plan = [
    ["Java Upgrade", `Upgrade from Java ${selectedSourceVersion} to Java ${selectedTargetVersion || "target version"}`, "Completed"],
    ["Dependency Upgrade", "Update dependencies to compatible versions", "In Progress"],
    ["Code Refactoring", "Refactor deprecated APIs and code changes", "Pending"],
    ["Testing & Validation", "Execute tests and validate the application", "Pending"],
    ["Deployment", "Deploy and monitor the application", "Pending"],
  ];

  return (
    <div className="strategy-dashboard">
      <section className="strategy-title-card">
        <div>
          <FileText size={24} />
          <div>
            <h2>Assessment & Migration Strategy</h2>
            <p>Review assessment results and define the migration roadmap</p>
          </div>
        </div>
        <button
          className="strategy-secondary-button"
          type="button"
          onClick={() => downloadReport("json", repoAnalysis, selectedTargetVersion, migrationApproach)}
        >
          <Download size={15} />
          Download Analysis Report
        </button>
      </section>

      <section className="strategy-summary-grid" aria-label="Strategy summary">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="strategy-summary-card" key={card.label}>
              <div className={`strategy-summary-icon ${card.tone}`}><Icon size={20} /></div>
              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className="strategy-controls-card">
        <div className="strategy-card-header">
          <h2>Migration Configuration</h2>
          <Chip label={`${riskLabel} Risk`} color={riskLevel === "low" ? "success" : riskLevel === "high" ? "error" : "warning"} size="small" />
        </div>

        <div className="strategy-approach-grid">
          {migrationApproachOptions.map((option) => (
            <button
              className={`strategy-approach-card${migrationApproach === option.value ? " active" : ""}`}
              style={{ borderColor: migrationApproach === option.value ? option.color : undefined }}
              type="button"
              key={option.value}
              onClick={() => onMigrationApproachChange(option.value)}
              title={option.tooltip}
            >
              <span>{option.icon}</span>
              <strong>{option.label}</strong>
              <small>{option.desc}</small>
            </button>
          ))}
        </div>

        <div className="strategy-form-grid">
          <div className="strategy-field">
            <label>Source Java Version</label>
            <div className="strategy-readonly-value">
              {userSelectedVersion
                ? `Java ${selectedSourceVersion} (manually selected)`
                : detectedJavaVersion && detectedJavaVersion !== "unknown"
                  ? `Java ${detectedJavaVersion} (detected)`
                  : "Source does not declare a Java version"}
            </div>
            {sourceNeedsSelection ? (
              <select value={selectedSourceVersion} onChange={(event) => onSourceVersionChange(event.target.value)}>
                <option value="7">Java 7 (Legacy)</option>
                <option value="8">Java 8 (LTS)</option>
                <option value="11">Java 11 (LTS)</option>
                <option value="17">Java 17 (LTS)</option>
                <option value="21">Java 21 (LTS)</option>
              </select>
            ) : null}
          </div>

          <div className="strategy-field">
            <label>Target Java Version</label>
            {versionRecommendationLoading ? (
              <div className="strategy-inline-info"><RefreshCw size={14} />Fetching recommended target Java version...</div>
            ) : null}
            {!versionRecommendationLoading && versionRecommendationError ? (
              <div className="strategy-inline-error">{versionRecommendationError}</div>
            ) : null}
            {!versionRecommendationLoading && !versionRecommendationError && versionRecommendation ? (
              <div className="strategy-recommendation-box">
                <div>
                  <span>Recommended Target</span>
                  <strong>Java {versionRecommendation.recommended_target_version}</strong>
                  <small>Confidence: {versionRecommendation.confidence}</small>
                </div>
                <button type="button" onClick={() => onUseRecommendation(versionRecommendation.recommended_target_version)}>
                  Use recommendation
                </button>
              </div>
            ) : null}
            <select value={selectedTargetVersion} onChange={(event) => onTargetVersionChange(event.target.value)}>
              <option value="" disabled>Select Java Version</option>
              {availableTargetVersions.map((version) => (
                <option key={version.value} value={version.value}>{version.label}</option>
              ))}
            </select>
            <small>Only versions newer than the source Java version are available</small>
          </div>
        </div>

        <div className="strategy-field">
          <label>{migrationApproach === "branch" ? "Target Branch Name" : "Target Repository Name"}</label>
          <input
            value={targetRepoName}
            onChange={(event) => onTargetRepoNameChange(event.target.value)}
            placeholder={targetRepoPlaceholder}
          />
        </div>
      </section>

      <section className="strategy-main-grid">
        <article className="strategy-card">
          <div className="strategy-card-header"><h2>Effort Breakdown</h2></div>
          <div className="strategy-donut-layout">
            <div className="strategy-donut">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={effortData} dataKey="value" innerRadius={62} outerRadius={102} paddingAngle={2}>
                    {effortData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div><strong>120</strong><span>Total Effort<br />Hours</span></div>
            </div>
            <div className="strategy-chart-legend">
              {effortData.map((entry) => (
                <div key={entry.name}><span style={{ backgroundColor: entry.color }} /><strong>{entry.name}</strong><em>{entry.value}</em></div>
              ))}
            </div>
          </div>
        </article>

        <article className="strategy-card">
          <div className="strategy-card-header"><h2>Upgrade Plan</h2></div>
          <div className="upgrade-plan">
            {plan.map(([title, description, status], index) => (
              <div className="upgrade-plan-row" key={title}>
                <div className={`upgrade-step-number ${index < 2 ? "active" : ""}`}>{index + 1}</div>
                <div>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </div>
                <Chip label={status} size="small" color={status === "Completed" ? "success" : status === "In Progress" ? "primary" : "default"} />
              </div>
            ))}
          </div>
        </article>

        <article className="strategy-card">
          <div className="strategy-card-header"><h2>Strategy Overview</h2></div>
          <div className="strategy-overview-list">
            <div><Code2 size={15} /><span>Target Java Version</span><strong>{selectedTargetVersion ? `Java ${selectedTargetVersion} (LTS)` : "Not selected"}</strong></div>
            <div><GitBranch size={15} /><span>Migration Approach</span><strong>{selectedApproach?.label || migrationApproach}</strong></div>
            <div><AlertTriangle size={15} /><span>Compatibility Risk</span><strong>{riskLabel}</strong></div>
            <div><ShieldAlert size={15} /><span>Breaking Changes</span><strong>{breakingChanges}</strong></div>
            <div><Clock size={15} /><span>Estimated Duration</span><strong>{duration}</strong></div>
            <div><Hammer size={15} /><span>Overall Complexity</span><strong>{effort === "High" ? "Complex" : effort === "Low" ? "Low" : "Moderate"}</strong></div>
          </div>
        </article>
      </section>

      <section className="strategy-lower-grid">
        <article className="strategy-card">
          <div className="strategy-card-header"><h2>Recommendations</h2></div>
          <div className="strategy-recommendation-list">
            {recommendations.map((recommendation) => (
              <div className="strategy-recommendation-card" key={recommendation.title}>
                <PackageCheck size={16} />
                <div><strong>{recommendation.title}</strong><span>{recommendation.description}</span></div>
                <Chip label={recommendation.priority} size="small" color={recommendation.priority === "High" ? "error" : recommendation.priority === "Low" ? "success" : "warning"} />
              </div>
            ))}
          </div>
        </article>

        <article className="strategy-card">
          <div className="strategy-card-header"><h2>Risk & Impact Analysis</h2></div>
          <div className="strategy-donut-layout">
            <div className="strategy-donut">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={riskData} dataKey="value" innerRadius={58} outerRadius={92} paddingAngle={2}>
                    {riskData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div><strong>12</strong><span>Total Risks</span></div>
            </div>
            <div className="strategy-chart-legend">
              {riskData.map((entry) => (
                <div key={entry.name}><span style={{ backgroundColor: entry.color }} /><strong>{entry.name}</strong><em>{entry.value}</em></div>
              ))}
            </div>
          </div>
        </article>

        <article className="strategy-card">
          <div className="strategy-card-header"><h2>Analysis Report</h2></div>
          <div className="strategy-report-success">
            <CheckCircle2 size={18} />
            <div><strong>Analysis Completed Successfully</strong><span>{new Date().toLocaleString()}</span></div>
          </div>
          <div className="strategy-report-actions">
            <button type="button" onClick={() => downloadReport("pdf", repoAnalysis, selectedTargetVersion, migrationApproach)}><FileText size={15} />PDF Report</button>
            <button type="button" onClick={() => downloadReport("xlsx", repoAnalysis, selectedTargetVersion, migrationApproach)}><FileSpreadsheet size={15} />Excel Report</button>
            <button type="button" onClick={() => downloadReport("json", repoAnalysis, selectedTargetVersion, migrationApproach)}><FileJson size={15} />JSON Report</button>
          </div>
          <div className="strategy-report-list">
            <strong>Report Includes</strong>
            {["Application Assessment Summary", "Dependency & Compatibility Analysis", "Migration Effort Breakdown", "Upgrade Plan & Recommendations", "Risk Analysis & Mitigation Plan"].map((item) => (
              <span key={item}><CheckCircle2 size={13} />{item}</span>
            ))}
          </div>
        </article>
      </section>

      <div className="strategy-footer-actions">
        <button className="strategy-secondary-button" type="button" onClick={onBack}>Back</button>
        <button className="strategy-primary-button" type="button" onClick={onContinue}>Continue to Migration</button>
      </div>
    </div>
  );
}
