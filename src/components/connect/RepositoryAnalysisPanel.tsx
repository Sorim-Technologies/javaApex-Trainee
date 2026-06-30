import type React from "react";
import type { RepoAnalysis, RepoInfo } from "../../services/api";
import type { SourceInputType } from "../../types/wizard";

type ZipUploadStatus = "idle" | "ready" | "uploading" | "success" | "error";

interface RepositoryAnalysisPanelProps {
  sourceInputType: SourceInputType;
  repoUrl: string;
  urlValidation: { valid: boolean; normalizedUrl: string; message: string };
  repoAccessCheckLoading: boolean;
  isPrivateRepo: boolean;
  canContinueRepository: boolean;
  selectedRepo: RepoInfo | null;
  repoAnalysis: RepoAnalysis | null;
  selectedZipFile: File | null;
  zipUploadStatus: ZipUploadStatus;
  onRetry: () => void;
}

const NOT_DETECTED = "Not Detected";

type ExtendedRepoAnalysis = RepoAnalysis & {
  javaVersion?: string | null;
  java_version_from_build?: string | null;
  detected_dependencies?: unknown[];
  dependency_updates?: unknown[];
  build?: {
    tool?: string | null;
    buildTool?: string | null;
    build_tool?: string | null;
    dependencies?: unknown[] | Record<string, unknown>;
  } | null;
  technologies?: unknown[];
  frameworks?: unknown[];
  detected_frameworks?: unknown[];
};

const titleCase = (value: string | null | undefined) => {
  if (!value) return NOT_DETECTED;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const normalizeValue = (value: unknown, fallback = NOT_DETECTED) => {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  if (!normalized || ["unknown", "not_specified", "not detected", "none", "null"].includes(normalized.toLowerCase())) {
    return fallback;
  }
  return normalized;
};

const parseRepositoryFromUrl = (repoUrl: string) => {
  const cleanUrl = repoUrl.trim().replace(/\.git$/, "");
  const match = cleanUrl.match(/(?:github|gitlab)\.com\/([^/]+)\/([^/?#]+)/i);
  return {
    owner: match?.[1] || NOT_DETECTED,
    repo: match?.[2] || NOT_DETECTED,
  };
};

const getJavaVersion = (analysis: RepoAnalysis | null) => {
  const extendedAnalysis = analysis as ExtendedRepoAnalysis | null;
  return normalizeValue(analysis?.java_version || extendedAnalysis?.javaVersion || extendedAnalysis?.java_version_from_build);
};

const getBuildTool = (analysis: RepoAnalysis | null) => {
  const extendedAnalysis = analysis as ExtendedRepoAnalysis | null;
  const buildTool =
    analysis?.build_tool ||
    (analysis as unknown as Record<string, unknown> | null)?.buildTool ||
    extendedAnalysis?.build?.build_tool ||
    extendedAnalysis?.build?.buildTool ||
    extendedAnalysis?.build?.tool ||
    (analysis?.structure?.has_pom_xml ? "maven" : analysis?.structure?.has_build_gradle ? "gradle" : null);

  return titleCase(normalizeValue(buildTool, ""));
};

const normalizeList = (value: unknown): unknown[] | null => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>);
  return null;
};

const getDependencyItems = (analysis: RepoAnalysis | null) => {
  const extendedAnalysis = analysis as ExtendedRepoAnalysis | null;
  return (
    normalizeList(analysis?.dependencies) ||
    normalizeList(extendedAnalysis?.detected_dependencies) ||
    normalizeList(extendedAnalysis?.dependency_updates) ||
    normalizeList(extendedAnalysis?.build?.dependencies)
  );
};

const readDependencyText = (dependency: unknown) => {
  if (!dependency || typeof dependency !== "object") return String(dependency || "");
  const record = dependency as Record<string, unknown>;
  return [
    record.group_id,
    record.groupId,
    record.artifact_id,
    record.artifactId,
    record.name,
    record.dependency,
  ]
    .filter(Boolean)
    .join(" ");
};

const readNamedItems = (items: unknown[] | Record<string, unknown> | undefined) => {
  const normalizedItems = Array.isArray(items) ? items : items && typeof items === "object" ? Object.values(items) : [];
  if (!normalizedItems.length) return [];
  return normalizedItems
    .map((item) => {
      if (!item || typeof item !== "object") return normalizeValue(item, "");
      const record = item as Record<string, unknown>;
      return normalizeValue(record.name || record.label || record.type || record.framework || record.technology, "");
    })
    .filter((item) => item !== NOT_DETECTED && item !== "");
};

const detectTechnologies = (analysis: RepoAnalysis | null) => {
  const technologies = new Set<string>();
  const extendedAnalysis = analysis as ExtendedRepoAnalysis | null;
  const dependencies = getDependencyItems(analysis) || [];
  const buildTool = getBuildTool(analysis);

  readNamedItems(extendedAnalysis?.technologies).forEach((technology) => technologies.add(technology));
  readNamedItems(extendedAnalysis?.frameworks).forEach((framework) => technologies.add(framework));
  readNamedItems(extendedAnalysis?.detected_frameworks).forEach((framework) => technologies.add(framework));

  if (buildTool !== NOT_DETECTED) technologies.add(buildTool);

  dependencies.forEach((dependency) => {
    const value = readDependencyText(dependency).toLowerCase();
    if (value.includes("spring")) technologies.add("Spring Boot");
    if (value.includes("lombok")) technologies.add("Lombok");
    if (value.includes("junit")) technologies.add("JUnit");
    if (value.includes("jackson")) technologies.add("Jackson");
    if (value.includes("hibernate")) technologies.add("Hibernate");
    if (value.includes("mysql")) technologies.add("MySQL");
  });

  return Array.from(technologies).slice(0, 8);
};

const getFrameworkCount = (analysis: RepoAnalysis | null) => {
  if (!analysis) return NOT_DETECTED;
  const extendedAnalysis = analysis as ExtendedRepoAnalysis | null;
  const explicitFrameworks = readNamedItems(extendedAnalysis?.frameworks).length || readNamedItems(extendedAnalysis?.detected_frameworks).length;
  if (explicitFrameworks > 0) return String(explicitFrameworks);

  const technologies = detectTechnologies(analysis);
  const frameworks = technologies.filter((technology) =>
    ["Spring Boot", "JUnit", "Jackson", "Hibernate", "Mockito"].includes(technology)
  );
  return frameworks.length ? String(frameworks.length) : NOT_DETECTED;
};

const getReadinessScore = (analysis: RepoAnalysis | null, isValidated: boolean) => {
  if (!isValidated) return 0;

  let score = 25;
  const javaVersion = getJavaVersion(analysis);
  const buildTool = getBuildTool(analysis);
  const dependenciesCount = getDependencyItems(analysis)?.length ?? 0;
  const technologiesCount = detectTechnologies(analysis).length;

  if (analysis) score += 15;
  if (javaVersion !== NOT_DETECTED) score += 20;
  if (buildTool !== NOT_DETECTED) score += 20;
  if (dependenciesCount > 0) score += 10;
  if (technologiesCount > 0) score += 10;

  return Math.min(score, 100);
};

const getReadinessLabel = (score: number) => {
  if (score >= 75) return "Good";
  if (score >= 50) return "Partial";
  if (score > 0) return "Needs Scan";
  return "Pending";
};

const getStatusText = (condition: boolean, successText: string, failureText = NOT_DETECTED) =>
  condition ? successText : failureText;

export default function RepositoryAnalysisPanel({
  sourceInputType,
  repoUrl,
  urlValidation,
  repoAccessCheckLoading,
  isPrivateRepo,
  canContinueRepository,
  selectedRepo,
  repoAnalysis,
  selectedZipFile,
  zipUploadStatus,
  onRetry,
}: RepositoryAnalysisPanelProps) {
  const isGithub = sourceInputType === "github";
  const hasRepositoryInput = isGithub ? Boolean(repoUrl.trim()) : Boolean(selectedZipFile);
  const isLoading = isGithub ? repoAccessCheckLoading : zipUploadStatus === "uploading";
  const hasError = isGithub
    ? Boolean(repoUrl.trim()) && !urlValidation.valid && !repoAccessCheckLoading
    : zipUploadStatus === "error";
  const isValidated = isGithub ? canContinueRepository : zipUploadStatus === "success";
  const parsedRepo = parseRepositoryFromUrl(urlValidation.normalizedUrl || repoUrl);
  const repoAnalysisRecord = (repoAnalysis || {}) as Record<string, unknown>;
  const selectedRepoRecord = (selectedRepo || {}) as Record<string, unknown>;
  const fullName =
    repoAnalysis?.full_name ||
    (repoAnalysisRecord.fullName as string | undefined) ||
    selectedRepo?.full_name ||
    (selectedRepoRecord.fullName as string | undefined) ||
    "";
  const [fullOwner, fullRepo] = fullName.includes("/") ? fullName.split("/") : ["", fullName];
  const zipProjectName = selectedZipFile?.name.replace(/\.zip$/i, "") || "";
  const repoName = repoAnalysis?.name || selectedRepo?.name || fullRepo || (isGithub ? parsedRepo.repo : zipProjectName);
  const owner = fullOwner || (isGithub ? parsedRepo.owner : "Local Upload");
  const branch =
    repoAnalysis?.default_branch ||
    (repoAnalysisRecord.defaultBranch as string | undefined) ||
    selectedRepo?.default_branch ||
    (selectedRepoRecord.defaultBranch as string | undefined) ||
    (isGithub ? NOT_DETECTED : "Uploaded ZIP");
  const buildTool = getBuildTool(repoAnalysis);
  const dependencyItems = getDependencyItems(repoAnalysis);
  const dependenciesCount = dependencyItems?.length ?? 0;
  const dependencies = dependencyItems ? String(dependenciesCount) : NOT_DETECTED;
  const javaVersion = getJavaVersion(repoAnalysis);
  const technologies = detectTechnologies(repoAnalysis);
  const hasAnalysisDetails = Boolean(repoAnalysis);
  const readinessScore = getReadinessScore(repoAnalysis, isValidated);
  const readinessLabel = getReadinessLabel(readinessScore);
  const hasJava = javaVersion !== NOT_DETECTED;
  const hasBuildTool = buildTool !== NOT_DETECTED;
  const hasFrameworks = technologies.length > 0;

  if (isLoading) {
    return (
      <section className="repo-analysis-panel repo-analysis-panel--embedded repo-analysis-panel--loading" aria-label="Repository analysis">
        <div className="repo-analysis-panel__header">
          <div className="repo-analysis-panel__icon repo-analysis-panel__icon--analysis">AI</div>
          <div>
            <h3>Repository Analysis</h3>
            <p>Analyzing repository...</p>
          </div>
        </div>
        <div className="repo-analysis-panel__loader" aria-hidden="true" />
        <div className="repo-analysis-skeleton repo-analysis-skeleton--wide" />
        <div className="repo-analysis-skeleton-grid">
          <div className="repo-analysis-skeleton" />
          <div className="repo-analysis-skeleton" />
          <div className="repo-analysis-skeleton" />
        </div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className="repo-analysis-panel repo-analysis-panel--embedded repo-analysis-panel--empty" aria-label="Repository analysis">
        <div className="repo-analysis-empty">
          <div className="repo-analysis-empty__icon">!</div>
          <h3>Repository Analysis Unavailable</h3>
          <p>Repository could not be analyzed.</p>
          <button type="button" className="repo-analysis-panel__button" onClick={onRetry} disabled={!canContinueRepository}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!hasRepositoryInput || !isValidated) {
    return (
      <section className="repo-analysis-panel repo-analysis-panel--embedded repo-analysis-panel--empty" aria-label="Repository analysis">
        <div className="repo-analysis-empty">
          <div className="repo-analysis-empty__icon">Repo</div>
          <h3>Repository Analysis</h3>
          <p>{hasRepositoryInput ? "Enter a valid GitHub repository to view project insights." : "No repository connected. Connect a repository to begin analysis."}</p>
          <button type="button" className="repo-analysis-panel__button" disabled>
            Waiting for Repository...
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="repo-analysis-panel repo-analysis-panel--embedded" aria-label="Repository analysis">
      <div className="repo-analysis-panel__header">
        <div className="repo-analysis-panel__icon repo-analysis-panel__icon--analysis">AI</div>
        <div>
          <div className="repo-analysis-title-row">
            <h3>Repository Analysis</h3>
            <span>AI</span>
          </div>
          <p>Comprehensive analysis of your repository</p>
        </div>
      </div>

      <div className="repo-analysis-top-grid">
        <section className="repo-analysis-section repo-analysis-overview-card">
          <h4><span className="repo-analysis-heading-icon repo-analysis-heading-icon--overview">OV</span>Repository Overview</h4>
          <div className="repo-analysis-overview">
            <span>Repository</span><strong>{repoName || NOT_DETECTED}</strong>
            <span>Owner</span><strong>{owner || NOT_DETECTED}</strong>
            <span>Branch</span><strong>{branch}</strong>
            <span>Visibility</span><strong>{isGithub ? (isPrivateRepo ? "Private" : "Public") : "ZIP Upload"}</strong>
          </div>
        </section>

        <section className="repo-analysis-section repo-analysis-technologies-card">
          <h4><span className="repo-analysis-heading-icon repo-analysis-heading-icon--tech">DT</span>Detected Technologies</h4>
          <div className="repo-analysis-tags">
            {technologies.length ? (
              technologies.map((technology) => <span key={technology}>{technology}</span>)
            ) : (
              <span className="repo-analysis-tag--empty">No technologies detected yet</span>
            )}
          </div>
        </section>

        <section className="repo-analysis-section repo-analysis-health-card">
          <h4><span className="repo-analysis-heading-icon repo-analysis-heading-icon--health">OK</span>Repository Health</h4>
          <div className="repo-analysis-health repo-analysis-health--stacked">
            <span>Repository Access <strong className={isValidated ? "repo-status-good" : "repo-status-warning"}>{getStatusText(isValidated, "Valid")}</strong></span>
            <span>Java Version <strong className={hasJava ? "repo-status-good" : "repo-status-warning"}>{getStatusText(hasJava, "Detected")}</strong></span>
            <span>Dependencies <strong className={dependencyItems ? "repo-status-good" : "repo-status-warning"}>{dependencyItems ? "Parsed" : NOT_DETECTED}</strong></span>
            <span>Framework <strong className={hasFrameworks ? "repo-status-good" : "repo-status-warning"}>{getStatusText(hasFrameworks, "Supported")}</strong></span>
          </div>
        </section>

        <section className="repo-analysis-section repo-analysis-recommendation">
          <h4><span className="repo-analysis-heading-icon repo-analysis-heading-icon--ai">AI</span>AI Recommendation</h4>
          <p>{hasAnalysisDetails ? "Repository is ready for migration analysis." : "Repository connected. Run analysis to detect Java version, dependencies, and build tool."}</p>
          <div><span>Estimated Migration Time</span><strong>{hasAnalysisDetails ? (readinessScore >= 70 ? "Medium" : "Review") : NOT_DETECTED}</strong></div>
          <div><span>Risk Level</span><strong>{hasAnalysisDetails ? (readinessScore >= 70 ? "Low" : "Review") : NOT_DETECTED}</strong></div>
        </section>
      </div>

      <div className="repo-analysis-bottom-grid">
        <section className="repo-analysis-section repo-analysis-quick-card">
          <h4><span className="repo-analysis-heading-icon repo-analysis-heading-icon--metrics">MX</span>Quick Metrics</h4>
          <div className="repo-analysis-metrics">
            <div className="repo-analysis-metric repo-analysis-metric--java"><span>JV</span><div><small>Java Version</small><strong>{javaVersion}</strong></div></div>
            <div className="repo-analysis-metric repo-analysis-metric--dependencies"><span>DP</span><div><small>Dependencies</small><strong>{dependencies}</strong></div></div>
            <div className="repo-analysis-metric repo-analysis-metric--framework"><span>FW</span><div><small>Frameworks</small><strong>{getFrameworkCount(repoAnalysis)}</strong></div></div>
            <div className="repo-analysis-metric repo-analysis-metric--build"><span>BT</span><div><small>Build Tool</small><strong>{buildTool}</strong></div></div>
          </div>
        </section>

        <section className="repo-analysis-section repo-analysis-summary-card">
          <h4><span className="repo-analysis-heading-icon repo-analysis-heading-icon--summary">MS</span>Migration Summary</h4>
          <ul className="repo-analysis-checklist">
            <li className="repo-analysis-checklist__success">Repository Connected</li>
            <li className="repo-analysis-checklist__success">Repository Verified</li>
            <li className={hasJava ? "repo-analysis-checklist__success" : "repo-analysis-checklist__warning"}>{hasJava ? "Java Version Detected" : "Java Version Not Detected"}</li>
            <li className={hasBuildTool ? "repo-analysis-checklist__success" : "repo-analysis-checklist__warning"}>{hasBuildTool ? "Build Tool Detected" : "Build Tool Not Detected"}</li>
            <li className={dependencyItems ? "repo-analysis-checklist__success" : "repo-analysis-checklist__warning"}>{dependencyItems ? "Dependencies Parsed" : "Dependencies Not Detected"}</li>
            <li className={hasFrameworks ? "repo-analysis-checklist__success" : "repo-analysis-checklist__warning"}>{hasFrameworks ? "Framework Identified" : "Framework Not Detected"}</li>
          </ul>
        </section>

        <section className="repo-analysis-section repo-analysis-readiness-card">
          <h4><span className="repo-analysis-heading-icon repo-analysis-heading-icon--readiness">RD</span>Migration Readiness</h4>
          <div className="repo-analysis-readiness-content">
            <div className={`repo-analysis-circle ${readinessScore >= 70 ? "repo-analysis-circle--good" : readinessScore >= 50 ? "repo-analysis-circle--partial" : "repo-analysis-circle--warning"}`} style={{ "--repo-score": `${readinessScore}%` } as React.CSSProperties}>
              <span>{readinessScore}%</span>
              <small>{readinessLabel}</small>
            </div>
            <div className="repo-analysis-readiness-copy">
              <p>{readinessScore >= 70 ? "Your repository is ready for migration." : "Repository is connected, but some analysis details are still missing."}</p>
              <ul>
                <li>Repository access is valid</li>
                <li>{hasBuildTool ? "Build tool detected" : "Build tool needs detection"}</li>
                <li>{dependencyItems ? "Dependencies parsed successfully" : "Dependencies not detected"}</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
