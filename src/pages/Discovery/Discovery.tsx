import React, { useState, useEffect, useCallback } from "react";
import { styles } from "../styles";
import {
  DiscoverySummary,
  RepositoryTree,
  BuildToolCard,
  FrameworkCard,
  DependencyTable,
  JavaVersionCard,
  RiskAnalysisCard,
  DiscoveryActions,
  NonJavaAlert,
  NoFrameworkAlert,
  FrameworkFileModal,
  RepositoryArchitectureCard,
} from "../../components/Discovery";
import type { RepositoryDiscoveryProps } from "../../components/Discovery/DiscoveryTypes";
import { DependencyGraph } from "../../components/DependencyGraph";

import {
    fetchDependencyGraph,
    getCodeComplexity,
} from "../../services/migrationService";
import type { CodeComplexityResponse, ComplexityFile } from "../../services/migrationService";
import ComplexitySummary from "../../components/CodeComplexity/ComplexitySummary";
import CodeComplexityHeatmap from "../../components/CodeComplexity/CodeComplexityHeatmap";
import ComplexityLegend from "../../components/CodeComplexity/ComplexityLegend";
import ComplexityTable from "../../components/CodeComplexity/ComplexityTable";
import ComplexityDetailsPanel from "../../components/CodeComplexity/ComplexityDetailsPanel";




export default function Discovery(props: RepositoryDiscoveryProps) {
  const {
    selectedRepo,
    repoAnalysis,
    analysisLoading,
    formattedAnalysisElapsed,
    isJavaProject,
    setStep,
    setSelectedRepo,
    setRepoAnalysis,
    setIsJavaProject,
    setRepoUrl,
    detectedFrameworks,
    isHighRiskProject,
    setIsHighRiskProject,
    highRiskConfirmed,
    setHighRiskConfirmed,
    suggestedJavaVersion,
    setSuggestedJavaVersion,
    setSelectedSourceVersion,
    selectedSourceVersion,
    sourceVersionStatus,
    setSourceVersionStatus,
    setUserSelectedVersion,
    conversionTypes,
    selectedConversions,
    setSelectedConversions,
    currentPath,
    pathHistory,
    navigateToRoot,
    showFileExplorer,
    setShowFileExplorer,
    navigateBack,
    repoFiles,
    handleFileClick,
    selectedFile,
    setSelectedFile,
    fileLoading,
    isEditing,
    editedContent,
    setEditedContent,
    fileContent,
    viewingFrameworkFile,
    setViewingFrameworkFile,
    frameworkFileLoading,
    setFrameworkFileLoading,
    currentToken,
  } = props;

  const detectedBuildType =
    repoAnalysis?.build_tool ||
    (repoAnalysis?.structure?.has_pom_xml
      ? "maven"
      : repoAnalysis?.structure?.has_build_gradle
        ? "gradle"
        : null);

  const detectedJavaVersion = repoAnalysis?.java_version || repoAnalysis?.java_version_from_build || null;
  const detectedJavaStructureLabel = detectedJavaVersion ? `✓ Java ${detectedJavaVersion}` : "✗ Java version";

  const primaryDetectedFramework =
    detectedFrameworks.find((fw) => fw.type === "Application Framework")?.name ||
    detectedFrameworks.find((fw) => fw.type === "ORM Framework")?.name ||
    detectedFrameworks[0]?.name ||
    null;

  const recommendedBuildConversionId =
    detectedBuildType === "maven"
      ? "maven_to_gradle"
      : detectedBuildType === "gradle"
        ? "gradle_to_maven"
        : null;

  const hasRecommendedBuildConversion = Boolean(
    recommendedBuildConversionId && conversionTypes.some((ct) => ct.id === recommendedBuildConversionId)
  );

  const buildConversionLabel =
    detectedBuildType === "maven"
      ? "Maven to Gradle build"
      : detectedBuildType === "gradle"
        ? "Gradle to Maven build"
        : "Proceed with migration";

  const buildConversionNote =
    detectedBuildType === "maven"
      ? "Detected Maven project; convert to a Gradle build."
      : detectedBuildType === "gradle"
        ? "Detected Gradle project; convert to a Maven build."
        : "No specific build tool conversion detected.";

  const applyRecommendedBuildConversion = () => {
    if (!recommendedBuildConversionId) return;

    const nextSelections = [recommendedBuildConversionId];
    if (selectedConversions.includes("java_version")) {
      nextSelections.push("java_version");
    }

    setSelectedConversions(nextSelections);
  };

  const handleFrameworkClick = async (fw: { name: string; path: string; type: string }) => {
    if (!selectedRepo) return;
    setFrameworkFileLoading(true);
    setViewingFrameworkFile({ name: fw.name, path: fw.path, content: "" });
    try {
      const { getFileContent } = await import("../../services/migrationService");
      const response = await getFileContent(selectedRepo.url, fw.path, currentToken);
      setViewingFrameworkFile({
        name: fw.name,
        path: fw.path,
        content: response.content,
      });
    } catch (err) {
      setViewingFrameworkFile({
        name: fw.name,
        path: fw.path,
        content: `// Error loading file: ${fw.path}`,
      });
    } finally {
      setFrameworkFileLoading(false);
    }
  };

  const [showGraph, setShowGraph] = useState(false);
  const [graphData, setGraphData] = useState<any>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  const handleViewGraphClick = async () => {
  if (!selectedRepo) return;

  setShowGraph(true);

  if (!graphData) {
    setGraphLoading(true);
    setGraphError(null);

    try {
      const res = await fetchDependencyGraph(
        selectedRepo.url,
        currentToken
      );

      setGraphData(res);
    } catch (err: any) {
      console.error(err);
      setGraphError(
        err.message || "Failed to load dependency graph."
      );
    } finally {
      setGraphLoading(false);
    }
  }
};

  // --- Code Complexity state ---
  const [complexityData, setComplexityData] = useState<CodeComplexityResponse | null>(null);
  const [loadingComplexity, setLoadingComplexity] = useState(false);
  const [selectedComplexityFile, setSelectedComplexityFile] = useState<ComplexityFile | null>(null);
  const [complexityError, setComplexityError] = useState<string | null>(null);

  const loadCodeComplexity = useCallback(async () => {
    if (!selectedRepo) return;
    setLoadingComplexity(true);
    setComplexityError(null);
    try {
      const data = await getCodeComplexity(selectedRepo.url, currentToken);
      setComplexityData(data);
    } catch (err: any) {
      console.error("Code complexity analysis failed:", err);
      setComplexityError(err.message || "Failed to analyze code complexity.");
    } finally {
      setLoadingComplexity(false);
    }
  }, [selectedRepo, currentToken]);

  // Auto-trigger complexity analysis after repository analysis completes
  useEffect(() => {
    if (!analysisLoading && repoAnalysis && selectedRepo && !complexityData && !loadingComplexity) {
      loadCodeComplexity();
    }
  }, [analysisLoading, repoAnalysis, selectedRepo]);


  return (
    <div style={styles.card}>
      <DiscoverySummary
        analysisLoading={analysisLoading}
        formattedAnalysisElapsed={formattedAnalysisElapsed}
      />

      {selectedRepo && (
        <>
          {analysisLoading ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinner}></div>
              <span>Analyzing repository...</span>
            </div>
          ) : (
            <>
              <NonJavaAlert
                isJavaProject={isJavaProject}
                setStep={setStep}
                setSelectedRepo={setSelectedRepo}
                setRepoAnalysis={setRepoAnalysis}
                setIsJavaProject={setIsJavaProject}
                setRepoUrl={setRepoUrl}
              />

              <NoFrameworkAlert
                isJavaProject={isJavaProject}
                detectedFrameworks={detectedFrameworks}
              />

              {isJavaProject !== false && (
                <>
                  <RiskAnalysisCard
                    isHighRiskProject={isHighRiskProject}
                    highRiskConfirmed={highRiskConfirmed}
                    setHighRiskConfirmed={setHighRiskConfirmed}
                    repoAnalysis={repoAnalysis}
                    detectedJavaVersion={detectedJavaVersion}
                    suggestedJavaVersion={suggestedJavaVersion}
                    setSuggestedJavaVersion={setSuggestedJavaVersion}
                    setSelectedSourceVersion={setSelectedSourceVersion}
                    setUserSelectedVersion={setUserSelectedVersion}
                    setSourceVersionStatus={setSourceVersionStatus}
                    sourceVersionStatus={sourceVersionStatus}
                    buildConversionLabel={buildConversionLabel}
                    buildConversionNote={buildConversionNote}
                    setStep={setStep}
                    setSelectedRepo={setSelectedRepo}
                    setRepoAnalysis={setRepoAnalysis}
                    setIsJavaProject={setIsJavaProject}
                    setIsHighRiskProject={setIsHighRiskProject}
                    setRepoUrl={setRepoUrl}
                  />

                  {(!isHighRiskProject || highRiskConfirmed) && (
                    <>
                      <RepositoryTree
                        selectedRepo={selectedRepo}
                        currentPath={currentPath}
                        navigateToRoot={navigateToRoot}
                        showFileExplorer={showFileExplorer}
                        setShowFileExplorer={setShowFileExplorer}
                        navigateBack={navigateBack}
                        repoFiles={repoFiles}
                        handleFileClick={handleFileClick}
                        selectedFile={selectedFile}
                        setSelectedFile={setSelectedFile}
                        fileLoading={fileLoading}
                        isEditing={isEditing}
                        editedContent={editedContent}
                        setEditedContent={setEditedContent}
                        fileContent={fileContent}
                      />

                      <div style={styles.discoveryContent}>
                        <div style={styles.discoveryItem}>
                          <JavaVersionCard detectedJavaVersion={detectedJavaVersion} />
                        </div>
                      </div>

                      <RepositoryArchitectureCard
                        hasJavaVersion={Boolean(detectedJavaVersion && detectedJavaVersion !== "unknown")}
                        hasFramework={detectedFrameworks.length > 0}
                        hasApi={Boolean(repoAnalysis?.api_endpoints && repoAnalysis.api_endpoints.length > 0)}
                        hasDependencyGraph={graphLoading || Boolean(graphData)}
                        hasCircularDependency={graphData ? graphData.hasCircularDependency : null}
                        onViewGraph={handleViewGraphClick}
                        loadingGraph={graphLoading}
                      />

                      <BuildToolCard
                        detectedJavaVersion={detectedJavaVersion}
                        detectedBuildType={detectedBuildType}
                        primaryDetectedFramework={primaryDetectedFramework}
                        hasRecommendedBuildConversion={hasRecommendedBuildConversion}
                        recommendedBuildConversionId={recommendedBuildConversionId}
                        buildConversionLabel={buildConversionLabel}
                        buildConversionNote={buildConversionNote}
                        selectedConversions={selectedConversions}
                        applyRecommendedBuildConversion={applyRecommendedBuildConversion}
                      />

                      <FrameworkCard
                        detectedFrameworks={detectedFrameworks}
                        onFrameworkClick={handleFrameworkClick}
                        repoAnalysis={repoAnalysis}
                      />

                      <DependencyTable
                        repoAnalysis={repoAnalysis}
                        detectedJavaVersion={detectedJavaVersion}
                        detectedJavaStructureLabel={detectedJavaStructureLabel}
                      />

                      {/* --- Code Complexity Section --- */}
                      {loadingComplexity && (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 14,
                          padding: 48,
                          marginTop: 24,
                          background: "#0f172a",
                          borderRadius: 12,
                          border: "1px solid #334155",
                        }}>
                          <div style={{
                            border: "4px solid #1e293b",
                            borderTop: "4px solid #2563eb",
                            borderRadius: "50%",
                            width: 32,
                            height: 32,
                            animation: "spin 1s linear infinite",
                          }} />
                          <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 14 }}>
                            Analyzing code complexity...
                          </span>
                          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                        </div>
                      )}

                      {complexityError && !loadingComplexity && (
                        <div style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          borderRadius: 12,
                          padding: "16px 20px",
                          marginTop: 24,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          color: "#fca5a5",
                          fontSize: 14,
                        }}>
                          <span>⚠️ {complexityError}</span>
                          <button
                            onClick={loadCodeComplexity}
                            style={{
                              background: "rgba(239, 68, 68, 0.2)",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              borderRadius: 8,
                              color: "#fca5a5",
                              padding: "6px 14px",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {complexityData && !loadingComplexity && (
                        <div style={{ marginTop: 32 }}>
                          <h2 style={{
                            fontSize: 20,
                            fontWeight: 800,
                            color: "var(--foreground, #f8fafc)",
                            marginBottom: 20,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}>
                            <span style={{ fontSize: 22 }}>📊</span>
                            Code Complexity Analysis
                          </h2>

                          <ComplexitySummary summary={complexityData.summary} />
                          <CodeComplexityHeatmap
                            files={complexityData.files}
                            onSelectFile={(file) => setSelectedComplexityFile(file)}
                          />
                          <ComplexityLegend />
                          <ComplexityTable
                            files={complexityData.files}
                            onSelectFile={(file) => setSelectedComplexityFile(file)}
                          />
                          <ComplexityDetailsPanel
                            file={selectedComplexityFile}
                            onClose={() => setSelectedComplexityFile(null)}
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      <FrameworkFileModal
        viewingFrameworkFile={viewingFrameworkFile}
        setViewingFrameworkFile={setViewingFrameworkFile}
        frameworkFileLoading={frameworkFileLoading}
      />

      {showGraph && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "24px",
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "1200px",
            height: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}>
            {graphLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "12px" }}>
                <div style={{
                  border: "4px solid #f3f4f6",
                  borderTop: "4px solid #2563eb",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  animation: "spin 1s linear infinite",
                }} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>
                  Analyzing repository files & generating dependency graph...
                </span>
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            ) : graphError ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "16px", padding: "32px", textAlign: "center" }}>
                <div style={{ fontSize: "36px" }}>⚠️</div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#991b1b" }}>Error Loading Graph</div>
                <div style={{ fontSize: "13px", color: "#4b5563", maxWidth: "450px" }}>{graphError}</div>
                <button
                  onClick={() => setShowGraph(false)}
                  style={{
                    padding: "8px 20px",
                    backgroundColor: "#1e293b",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>
              </div>
            ) : graphData ? (
              <DependencyGraph graphData={graphData} onClose={() => setShowGraph(false)} />
            ) : null}
          </div>
        </div>
      )}

      <DiscoveryActions
        setStep={setStep}
        isJavaProject={isJavaProject}
        isHighRiskProject={isHighRiskProject}
        highRiskConfirmed={highRiskConfirmed}
        analysisLoading={analysisLoading}
        hasRepoAnalysis={!!repoAnalysis}
      />
    </div>
  );
}
