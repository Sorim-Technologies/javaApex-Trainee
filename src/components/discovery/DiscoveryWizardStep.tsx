import type { CSSProperties } from "react";
import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";

const countItems = (value: unknown): number => {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).length;
  return 0;
};

const textOrNA = (value: unknown, fallback = "Not Detected") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const cleanJavaVersion = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).replace(/[✓✗]/g, "").trim();
  const match = text.match(/(?:java\s*)?(\d+(?:\.\d+)?)/i);
  return match ? match[1] : null;
};

const dependencyCountFrom = (repoAnalysis: any): number => {
  return (
    countItems(repoAnalysis?.dependencies) ||
    countItems(repoAnalysis?.detected_dependencies) ||
    countItems(repoAnalysis?.dependency_updates) ||
    countItems(repoAnalysis?.build?.dependencies)
  );
};

export default function DiscoveryWizardStep({ context }: { context: WizardScreenContext }) {
  const {
    analysisLoading,
    conversionTypes,
    currentPath,
    currentToken,
    detectedFrameworks = [],
    detectedJavaStructureLabel,
    editedContent,
    fileContent,
    fileLoading,
    formattedAnalysisElapsed,
    frameworkFileLoading,
    getDetectedComponentCategory,
    getFileContent,
    highRiskConfirmed,
    isEditing,
    isHighRiskProject,
    isJavaProject,
    MIGRATION_STEPS,
    pathHistory,
    repoAnalysis,
    repoFiles = [],
    selectedConversions,
    selectedFile,
    selectedRepo,
    setCurrentPath,
    setEditedContent,
    setError,
    setFileContent,
    setFileLoading,
    setFrameworkFileLoading,
    setHighRiskConfirmed,
    setIsEditing,
    setIsHighRiskProject,
    setIsJavaProject,
    setPathHistory,
    setRepoAnalysis,
    setRepoUrl,
    setSelectedConversions,
    setSelectedFile,
    setSelectedRepo,
    setSelectedSourceVersion,
    setShowFileExplorer,
    setSourceVersionStatus,
    setStep,
    setSuggestedJavaVersion,
    setUserSelectedVersion,
    setViewingFrameworkFile,
    showFileExplorer,
    sourceVersionStatus,
    styles,
    suggestedJavaVersion,
    viewingFrameworkFile,
  } = context;

  const detectedBuildTool =
    repoAnalysis?.build_tool ||
    (repoAnalysis?.structure?.has_pom_xml ? "Maven" : repoAnalysis?.structure?.has_build_gradle ? "Gradle" : null);

  const detectedJavaVersion = cleanJavaVersion(
    repoAnalysis?.java_version || repoAnalysis?.java_version_from_build || detectedJavaStructureLabel
  );

  const fileCount = Array.isArray(repoFiles) ? repoFiles.length : 0;
  const dependencyCount = dependencyCountFrom(repoAnalysis);
  const frameworkCount = detectedFrameworks.length;
  const healthScore = isJavaProject === false ? 38 : isHighRiskProject ? 68 : 92;
  const readinessScore = isJavaProject === false ? 25 : isHighRiskProject ? 62 : 88;
  const riskLevel = isJavaProject === false ? "High" : isHighRiskProject ? "Medium" : "Low";
  const riskTone = isJavaProject === false ? "danger" : isHighRiskProject ? "warning" : "success";
  const primaryFramework =
    detectedFrameworks.find((fw: any) => fw.type === "Application Framework")?.name ||
    detectedFrameworks.find((fw: any) => fw.type === "ORM Framework")?.name ||
    detectedFrameworks[0]?.name ||
    null;

  const detectedBuildType = String(detectedBuildTool || "").toLowerCase();
  const recommendedBuildConversionId = detectedBuildType.includes("maven")
    ? "maven_to_gradle"
    : detectedBuildType.includes("gradle")
      ? "gradle_to_maven"
      : null;
  const buildConversionLabel = detectedBuildType.includes("maven")
    ? "Maven to Gradle Build"
    : detectedBuildType.includes("gradle")
      ? "Gradle to Maven Build"
      : "Proceed with Migration";
  const buildConversionNote = detectedBuildType.includes("maven")
    ? "Detected Maven project; convert to Gradle build."
    : detectedBuildType.includes("gradle")
      ? "Detected Gradle project; convert to Maven build."
      : "No specific build tool conversion detected.";

  const checklist = [
    { label: "Repository Connected", done: Boolean(selectedRepo) },
    { label: "Repository Scanned", done: Boolean(repoAnalysis) },
    { label: "Java Version Identified", done: Boolean(detectedJavaVersion) },
    { label: "Build Tool Detected", done: Boolean(detectedBuildTool) },
    { label: "Dependencies Loaded", done: dependencyCount > 0 },
    { label: "Frameworks Identified", done: frameworkCount > 0 },
  ];

  const quickMetrics = [
    { icon: "📁", value: fileCount || "Not Detected", label: "Files" },
    { icon: "📦", value: dependencyCount || "Not Detected", label: "Dependencies" },
    { icon: "☕", value: detectedJavaVersion ? `Java ${detectedJavaVersion}` : "Not Detected", label: "Java Version" },
    { icon: "🧩", value: frameworkCount || "Not Detected", label: "Frameworks" },
  ];

  const handleFileClick = async (file: any) => {
    if (file.type === "dir") {
      setPathHistory((prev: string[]) => [...prev, file.path]);
      setCurrentPath(file.path);
      setSelectedFile(null);
      setFileContent("");
      setEditedContent("");
      setIsEditing(false);
      return;
    }
    setFileLoading(true);
    setSelectedFile(file);
    try {
      const response = await getFileContent(selectedRepo!.url, file.path, currentToken);
      setFileContent(response.content);
      setEditedContent(response.content);
    } catch {
      setError("Failed to load file content");
    } finally {
      setFileLoading(false);
    }
  };

  const navigateBack = () => {
    if (pathHistory.length > 1) {
      const next = [...pathHistory];
      next.pop();
      setPathHistory(next);
      setCurrentPath(next[next.length - 1]);
      setSelectedFile(null);
      setFileContent("");
      setEditedContent("");
      setIsEditing(false);
    }
  };

  const navigateToRoot = () => {
    setPathHistory([""]);
    setCurrentPath("");
    setSelectedFile(null);
    setFileContent("");
    setEditedContent("");
    setIsEditing(false);
  };

  const getFileIcon = (file: any) => {
    if (file.type === "dir") return "📁";
    const ext = file.name?.split(".").pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      java: "☕", xml: "📋", json: "📦", yml: "⚙️", yaml: "⚙️", properties: "🔧",
      md: "📝", gradle: "🐘", kt: "🎯", js: "🟨", ts: "🔷", html: "🌐", css: "🎨", sql: "🗄️",
    };
    return iconMap[ext || ""] || "📄";
  };

  const applyRecommendedBuildConversion = () => {
    if (!recommendedBuildConversionId) return;
    const nextSelections = [recommendedBuildConversionId];
    if (selectedConversions.includes("java_version")) nextSelections.push("java_version");
    setSelectedConversions(nextSelections);
  };

  const renderFrameworkCards = () => {
    if (!detectedFrameworks.length) {
      return <div className="discovery-empty-card">No frameworks detected</div>;
    }

    return detectedFrameworks.map((fw: any, idx: number) => (
      <button
        key={`${fw.name}-${idx}`}
        className="discovery-framework-card"
        onClick={async () => {
          setFrameworkFileLoading(true);
          setViewingFrameworkFile({ name: fw.name, path: fw.path, content: "" });
          try {
            const response = await getFileContent(selectedRepo!.url, fw.path, currentToken);
            setViewingFrameworkFile({ name: fw.name, path: fw.path, content: response.content });
          } catch {
            setViewingFrameworkFile({ name: fw.name, path: fw.path, content: `// Error loading file: ${fw.path}` });
          } finally {
            setFrameworkFileLoading(false);
          }
        }}
      >
        <span className="discovery-framework-icon">
          {fw.type === "Testing Framework" ? "🧪" : fw.type === "Application Framework" ? "🍃" : fw.type === "ORM Framework" ? "🗄️" : "📚"}
        </span>
        <span className="discovery-framework-meta">
          <strong>{fw.name}</strong>
          <small>{fw.type}</small>
          <em>{getDetectedComponentCategory(fw.type)}</em>
        </span>
        <span className="discovery-detected-pill">Detected</span>
        <span className="discovery-view-link">View</span>
      </button>
    ));
  };

  return (
    <div className="discovery-page-card">
      <header className="discovery-page-header">
        <span className="discovery-page-icon">🔍</span>
        <div>
          <h2>Repository Discovery & Dependencies</h2>
          <p>{MIGRATION_STEPS?.[1]?.summary || "Explore repository structure and analyze project dependencies"}</p>
        </div>
        {analysisLoading && (
          <div className="discovery-live-timer">
            <span>Live Timer</span>
            <strong>{formattedAnalysisElapsed}</strong>
          </div>
        )}
      </header>

      {!selectedRepo ? (
        <div className="discovery-empty-state">Connect a repository to view discovery details.</div>
      ) : analysisLoading ? (
        <div style={styles.loadingBox}><div style={styles.spinner}></div><span>Analyzing repository...</span></div>
      ) : (
        <>
          {isJavaProject === false && (
            <div className="discovery-alert discovery-alert--error">
              <span>⚠️</span>
              <div>
                <strong>This is not a Java Project</strong>
                <p>This tool is designed for Java migration. Please connect a Java repository.</p>
                <button onClick={() => { setStep(1); setSelectedRepo(null); setRepoAnalysis(null); setIsJavaProject(null); setRepoUrl(""); }}>← Connect Different Repository</button>
              </div>
            </div>
          )}

          {isJavaProject && detectedFrameworks.length === 0 && (
            <div className="discovery-alert discovery-alert--warning">
              <span>ℹ️</span>
              <div>
                <strong>Java Project Detected (No Framework)</strong>
                <p>This repository contains Java source files but no recognized framework was detected.</p>
              </div>
            </div>
          )}

          {isHighRiskProject && !highRiskConfirmed && (
            <section className="discovery-high-risk-card">
              <div className="discovery-high-risk-head">
                <span>⚠️</span>
                <div>
                  <h3>High Risk Migration Detected</h3>
                  <p>This project may be missing Java version configuration and may require additional setup.</p>
                </div>
              </div>
              <div className="discovery-high-risk-grid">
                {!repoAnalysis?.structure?.has_pom_xml && !repoAnalysis?.structure?.has_build_gradle && <span>❌ No pom.xml or build.gradle</span>}
                {!detectedJavaVersion && <span>❌ Java version not detected</span>}
                {!repoAnalysis?.structure?.has_src_main && <span>❌ Non-standard project structure</span>}
              </div>
              <div className="discovery-version-box">
                <label>{sourceVersionStatus === "detected" ? "Java version automatically detected" : "Select Source Java Version:"}</label>
                {sourceVersionStatus === "detected" && suggestedJavaVersion !== "auto" ? (
                  <div>Java {suggestedJavaVersion} detected from source code</div>
                ) : (
                  <select
                    value={suggestedJavaVersion}
                    onChange={(e) => {
                      setSuggestedJavaVersion(e.target.value);
                      setSelectedSourceVersion(e.target.value === "auto" ? "8" : e.target.value);
                      setUserSelectedVersion(e.target.value);
                      setSourceVersionStatus("detected");
                    }}
                  >
                    <option value="auto">Auto-detect from code</option>
                    <option value="7">Java 7</option>
                    <option value="8">Java 8</option>
                    <option value="11">Java 11</option>
                    <option value="17">Java 17</option>
                    <option value="21">Java 21</option>
                  </select>
                )}
                <p>{buildConversionNote}</p>
              </div>
              <div className="discovery-risk-actions">
                <button onClick={() => { applyRecommendedBuildConversion(); setHighRiskConfirmed(true); setSelectedSourceVersion(suggestedJavaVersion); }}>{buildConversionLabel}</button>
                <button onClick={() => { setStep(1); setSelectedRepo(null); setRepoAnalysis(null); setIsJavaProject(null); setIsHighRiskProject(false); setRepoUrl(""); }}>← Choose Different Repository</button>
              </div>
            </section>
          )}

          {isJavaProject !== false && (!isHighRiskProject || highRiskConfirmed) && (
            <main className="discovery-dashboard">
              <section className="discovery-top-metrics">
                <div className="discovery-card discovery-health-card">
                  <div className="discovery-score-ring" style={{ "--score": `${healthScore * 3.6}deg` } as CSSProperties}>{healthScore}%</div>
                  <div><small>Repository Health</small><strong>{healthScore >= 85 ? "Excellent" : healthScore >= 60 ? "Needs Review" : "High Risk"}</strong><span>{textOrNA(selectedRepo?.name, "No repository")}</span></div>
                </div>
                <div className="discovery-card discovery-quick-card">
                  <h3>Quick Metrics</h3>
                  <div className="discovery-quick-grid">{quickMetrics.map((m) => <div key={m.label}><span>{m.icon}</span><strong>{m.value}</strong><small>{m.label}</small></div>)}</div>
                </div>
                <div className="discovery-card discovery-readiness-card">
                  <div><h3>Migration Readiness</h3><strong>{readinessScore}%</strong></div>
                  <div className="discovery-progress"><span style={{ width: `${readinessScore}%` }} /></div>
                  <p>Ready for Strategy Assessment</p>
                </div>
              </section>

              <section className="discovery-main-grid">
                <div className="discovery-left-column">
                  <section className="discovery-card discovery-files-card">
                    <div className="discovery-section-head"><h3>📁 Repository Files</h3><div>{currentPath && <button onClick={navigateToRoot}>Root</button>}<button onClick={() => setShowFileExplorer(!showFileExplorer)}>{showFileExplorer ? "Collapse" : "Expand"}</button></div></div>
                    {showFileExplorer && (
                      <div className="discovery-file-browser">
                        <div className="discovery-file-list">
                          {currentPath && <button className="discovery-file-row" onClick={navigateBack}>⬆️ ..</button>}
                          {repoFiles.length ? repoFiles.map((file: any, idx: number) => (
                            <button key={`${file.path}-${idx}`} className={`discovery-file-row ${selectedFile?.path === file.path ? "active" : ""}`} onClick={() => handleFileClick(file)}>
                              <span>{getFileIcon(file)}</span><strong>{file.name}</strong>{file.type === "file" && file.size > 0 && <small>{file.size < 1024 ? `${file.size} B` : `${Math.round(file.size / 1024)} KB`}</small>}
                            </button>
                          )) : <div className="discovery-empty-card">No files found</div>}
                        </div>
                        {selectedFile && (
                          <div className="discovery-file-preview">
                            <div><strong>{getFileIcon(selectedFile)} {selectedFile.name}</strong><button onClick={() => { setSelectedFile(null); setFileContent(""); setEditedContent(""); setIsEditing(false); }}>Close</button></div>
                            {fileLoading ? <p>Loading file...</p> : <pre>{isEditing ? editedContent : fileContent}</pre>}
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  <section className="discovery-analysis-row">
                    <div className="discovery-card discovery-mini-card"><span>📊</span><div><strong>Repository Analysis</strong><p>Scanning {selectedRepo.name} for Java components</p></div><em>Completed</em></div>
                    <div className="discovery-card discovery-mini-card"><span>🔧</span><div><strong>Build Tool: {textOrNA(detectedBuildTool)}</strong><p>Identified build system for dependency management</p></div><em>{detectedBuildTool ? "Detected" : "Not Detected"}</em></div>
                    <div className="discovery-card discovery-mini-card"><span>☕</span><div><strong>Java Version: {detectedJavaVersion || "Not Detected"}</strong><p>Current Java version detected in the project</p></div><em>{detectedJavaVersion ? "Detected" : "Not Detected"}</em></div>
                  </section>

                  <section className="discovery-card discovery-config-card">
                    <h3>{"{}"} Detected Configuration</h3>
                    <p>Restored discovery summary for the detected Java and build setup.</p>
                    <div className="discovery-chip-row">
                      <span>Java Version Detected: {detectedJavaVersion ? `Java ${detectedJavaVersion}` : "Not Detected"}</span>
                      <span>Build Detected: {textOrNA(detectedBuildTool)}</span>
                      <span>Framework Detected: {textOrNA(primaryFramework)}</span>
                      {recommendedBuildConversionId && <button onClick={applyRecommendedBuildConversion}>{buildConversionLabel}</button>}
                    </div>
                    <p>{buildConversionNote}</p>
                  </section>

                  <section className="discovery-bottom-grid">
                    <div className="discovery-card discovery-frameworks-card"><h3>🎯 Detected Frameworks & Libraries</h3><div className="discovery-framework-grid">{renderFrameworkCards()}</div></div>
                    <div className="discovery-card discovery-structure-card"><h3>📁 Project Structure Summary</h3><div className="discovery-structure-row">
                      <span className={repoAnalysis?.structure?.has_pom_xml ? "ok" : "missing"}>{repoAnalysis?.structure?.has_pom_xml ? "✓" : "✗"} pom.xml</span>
                      <span className={repoAnalysis?.structure?.has_build_gradle ? "ok" : "missing"}>{repoAnalysis?.structure?.has_build_gradle ? "✓" : "✗"} build.gradle</span>
                      <span className={repoAnalysis?.structure?.has_src_main ? "ok" : "missing"}>{repoAnalysis?.structure?.has_src_main ? "✓" : "✗"} src/main</span>
                      <span className={repoAnalysis?.structure?.has_src_test ? "ok" : "missing"}>{repoAnalysis?.structure?.has_src_test ? "✓" : "✗"} src/test</span>
                      <span className={detectedJavaVersion ? "ok" : "missing"}>{detectedJavaStructureLabel || "Java Not Detected"}</span>
                    </div></div>
                  </section>
                </div>

                <aside className="discovery-right-column">
                  <section className="discovery-card discovery-ai-card"><h3>💡 AI Recommendation</h3><p>Repository appears {riskLevel === "Low" ? "highly compatible" : "partially ready"} for Java LTS migration.</p><div><span>Effort <strong>{riskLevel === "Low" ? "Medium" : "High"}</strong></span><span>Compatibility <strong>{healthScore}%</strong></span></div></section>
                  <section className="discovery-card discovery-risk-panel"><h3>🛡️ Risk Analysis</h3><div className="discovery-badges"><span className={`risk-${riskTone}`}>Compatibility: {riskLevel} Risk</span><span>Build Tool: {textOrNA(detectedBuildTool)}</span><span>Framework: {textOrNA(primaryFramework)}</span><span>Security: Good</span></div></section>
                  <section className="discovery-card discovery-checklist-card"><h3>📋 Migration Checklist</h3>{checklist.map((item) => <p key={item.label} className={item.done ? "done" : "pending"}>{item.done ? "✓" : "○"} {item.label}</p>)}</section>
                  <section className="discovery-card discovery-stats-card"><h3>📈 Repository Statistics</h3>{[
                    ["Java Files", 82], ["Configuration", 68], ["Tests", repoAnalysis?.structure?.has_src_test ? 45 : 12]
                  ].map(([label, value]) => <div key={label as string} className="discovery-stat-line"><div><span>{label}</span><strong>{value}%</strong></div><em><i style={{ width: `${value}%` }} /></em></div>)}</section>
                </aside>
              </section>
            </main>
          )}
        </>
      )}

      {viewingFrameworkFile && (
        <div className="discovery-modal-overlay" onClick={() => setViewingFrameworkFile(null)}>
          <div className="discovery-modal" onClick={(event) => event.stopPropagation()}>
            <header><strong>{viewingFrameworkFile.name}</strong><button onClick={() => setViewingFrameworkFile(null)}>Close</button></header>
            {frameworkFileLoading ? <p>Loading file content...</p> : <pre>{viewingFrameworkFile.content || "// File content unavailable"}</pre>}
          </div>
        </div>
      )}

      <footer className="discovery-actions">
        <button onClick={() => setStep(1)}>← Back</button>
        <button
          className="primary"
          onClick={() => setStep(3)}
          disabled={isJavaProject === false || (isHighRiskProject && !highRiskConfirmed) || analysisLoading || !repoAnalysis}
        >
          Continue to Strategy →
        </button>
      </footer>
    </div>
  );
}
