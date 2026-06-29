import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";

export default function DiscoveryWizardStep({ context }: { context: WizardScreenContext }) {
  const {
    analysisLoading,
    conversionTypes,
    currentPath,
    currentToken,
    detectedFrameworks,
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
    repoFiles,
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

  // Consolidated Step 2: Discovery (Repository discovery + Dependencies)
  const renderDiscoveryStep = () => {
    // Helper function to handle file click
    const handleFileClick = async (file: RepoFile) => {
      if (file.type === "dir") {
        setPathHistory(prev => [...prev, file.path]);
        setCurrentPath(file.path);
        setSelectedFile(null);
        setFileContent("");
        setEditedContent("");
        setIsEditing(false);
      } else {
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
      }
    };

    // Helper to navigate back in folder structure
    const navigateBack = () => {
      if (pathHistory.length > 1) {
        const newHistory = [...pathHistory];
        newHistory.pop();
        setPathHistory(newHistory);
        setCurrentPath(newHistory[newHistory.length - 1]);
        setSelectedFile(null);
        setFileContent("");
        setEditedContent("");
        setIsEditing(false);
      }
    };

    // Helper to navigate to root
    const navigateToRoot = () => {
      setPathHistory([""]);
      setCurrentPath("");
      setSelectedFile(null);
      setFileContent("");
      setEditedContent("");
      setIsEditing(false);
    };

    // Get file extension for syntax highlighting hint
    const getFileLanguage = (fileName: string) => {
      const ext = fileName.split('.').pop()?.toLowerCase();
      const langMap: { [key: string]: string } = {
        'java': 'Java',
        'xml': 'XML',
        'json': 'JSON',
        'yml': 'YAML',
        'yaml': 'YAML',
        'properties': 'Properties',
        'md': 'Markdown',
        'gradle': 'Gradle',
        'kt': 'Kotlin',
        'js': 'JavaScript',
        'ts': 'TypeScript',
        'html': 'HTML',
        'css': 'CSS',
        'sql': 'SQL',
        'sh': 'Shell',
        'bat': 'Batch',
        'txt': 'Text'
      };
      return langMap[ext || ''] || 'Text';
    };

    // Get file icon based on type
    const getFileIcon = (file: RepoFile) => {
      if (file.type === "dir") return "📁";
      const ext = file.name.split('.').pop()?.toLowerCase();
      const iconMap: { [key: string]: string } = {
        'java': '☕',
        'xml': '📋',
        'json': '📦',
        'yml': '⚙️',
        'yaml': '⚙️',
        'properties': '🔧',
        'md': '📝',
        'gradle': '🐘',
        'kt': '🎯',
        'js': '🟨',
        'ts': '🔷',
        'html': '🌐',
        'css': '🎨',
        'sql': '🗄️',
        'sh': '💻',
        'txt': '📄'
      };
      return iconMap[ext || ''] || '📄';
    };

    const detectedBuildType = repoAnalysis?.build_tool ||
      (repoAnalysis?.structure?.has_pom_xml ? "maven" : repoAnalysis?.structure?.has_build_gradle ? "gradle" : null);
    const detectedJavaVersion = repoAnalysis?.java_version || repoAnalysis?.java_version_from_build || null;
    const primaryDetectedFramework =
      detectedFrameworks.find((fw) => fw.type === "Application Framework")?.name ||
      detectedFrameworks.find((fw) => fw.type === "ORM Framework")?.name ||
      detectedFrameworks[0]?.name ||
      null;
    const recommendedBuildConversionId = detectedBuildType === "maven"
      ? "maven_to_gradle"
      : detectedBuildType === "gradle"
        ? "gradle_to_maven"
        : null;
    const hasRecommendedBuildConversion = Boolean(
      recommendedBuildConversionId && conversionTypes.some((ct) => ct.id === recommendedBuildConversionId)
    );

    const buildConversionLabel = detectedBuildType === "maven"
      ? "Maven to Gradle build"
      : detectedBuildType === "gradle"
        ? "Gradle to Maven build"
        : "Proceed with migration";

    const buildConversionNote = detectedBuildType === "maven"
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

    return (
    <div style={styles.card}>
      <div style={styles.stepHeader}>
        <span style={styles.stepIcon}>🔍</span>
        <div>
          <h2 style={styles.title}>Repository Discovery & Dependencies</h2>
          <p style={styles.subtitle}>{MIGRATION_STEPS[1].summary}</p>
        </div>
        {analysisLoading && (
          <div style={styles.timerBadge}>
            <span style={styles.timerLabel}>Live Timer</span>
            <span style={styles.timerValue}>{formattedAnalysisElapsed}</span>
          </div>
        )}
      </div>

      {selectedRepo && (
        <>
          {analysisLoading ? <div style={styles.loadingBox}><div style={styles.spinner}></div><span>Analyzing repository...</span></div> : (
            <>
              {/* Not a Java Project Alert or No Framework Detected */}
              {isJavaProject === false ? (
                <div style={{
                  background: "#fef2f2",
                  border: "2px solid #ef4444",
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16
                }}>
                  <span style={{ fontSize: 32 }}>⚠️</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>
                      This is not a Java Project
                    </div>
                    <div style={{ fontSize: 14, color: "#b91c1c", lineHeight: 1.6 }}>
                      The repository you connected does not appear to be a Java project. 
                      This tool is designed specifically for Java application migration. 
                      Please connect a repository that contains Java source code, 
                      Maven (pom.xml), or Gradle (build.gradle) configuration files.
                    </div>
                    <button 
                      style={{ 
                        marginTop: 16, 
                        backgroundColor: "#ef4444", 
                        color: "#fff", 
                        border: "none", 
                        borderRadius: 8, 
                        padding: "10px 20px", 
                        fontWeight: 600, 
                        cursor: "pointer",
                        fontSize: 14
                      }}
                      onClick={() => {
                        setStep(1);
                        setSelectedRepo(null);
                        setRepoAnalysis(null);
                        setIsJavaProject(null);
                        setRepoUrl("");
                      }}
                    >
                      ← Connect Different Repository
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Java project but no framework detected */}
              {isJavaProject && detectedFrameworks.length === 0 && (
                <div style={{
                  background: "#fef9c3",
                  border: "2px solid #facc15",
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16
                }}>
                  <span style={{ fontSize: 32 }}>ℹ️</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>
                      Java Project Detected (No Framework)
                    </div>
                    <div style={{ fontSize: 14, color: "#a16207", lineHeight: 1.6 }}>
                      This repository contains Java source files but no recognized framework (e.g., Spring, Spring Boot, Jakarta EE) was detected. You can still proceed with migration, but some automation features may be limited.
                    </div>
                  </div>
                </div>
              )}

              {/* Show discovery content only if it's a Java project */}
              {isJavaProject !== false && (
                <>
                  {/* High Risk Project Warning (no pom.xml/build.gradle or unknown Java version) */}
                  {isHighRiskProject && !highRiskConfirmed && (
                    <div style={{
                      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                      border: "2px solid #f59e0b",
                      borderRadius: 12,
                      padding: 24,
                      marginBottom: 24,
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)"
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
                        <span style={{ fontSize: 40 }}>⚠️</span>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>
                            High Risk Migration Detected
                          </div>
                      <div style={{ fontSize: 14, color: "#a16207", lineHeight: 1.7 }}>
                            This project may be missing Java version configuration and may require additional setup:
                          </div>
                        </div>
                      </div>
                      
                      {/* Missing Items */}
                      <div style={{
                        background: "rgba(255,255,255,0.7)",
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 20
                      }}>
                        <div style={{ fontWeight: 600, color: "#92400e", marginBottom: 12 }}>🔍 Missing Components:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                          {!repoAnalysis?.structure?.has_pom_xml && !repoAnalysis?.structure?.has_build_gradle && (
                            <div style={{
                              background: "#fef2f2",
                              border: "1px solid #fecaca",
                              borderRadius: 6,
                              padding: "8px 12px",
                              fontSize: 13,
                              color: "#991b1b",
                              display: "flex",
                              alignItems: "center",
                              gap: 6
                            }}>
                              <span>❌</span> No pom.xml or build.gradle
                            </div>
                          )}
                          {(!((repoAnalysis?.java_version || repoAnalysis?.java_version_from_build)) || (repoAnalysis?.java_version || repoAnalysis?.java_version_from_build) === "unknown") && (
                            <div style={{
                              background: "#fef2f2",
                              border: "1px solid #fecaca",
                              borderRadius: 6,
                              padding: "8px 12px",
                              fontSize: 13,
                              color: "#991b1b",
                              display: "flex",
                              alignItems: "center",
                              gap: 6
                            }}>
                              <span>❌</span> Java version not detected
                            </div>
                          )}
                          {!repoAnalysis?.structure?.has_src_main && (
                            <div style={{
                              background: "#fef2f2",
                              border: "1px solid #fecaca",
                              borderRadius: 6,
                              padding: "8px 12px",
                              fontSize: 13,
                              color: "#991b1b",
                              display: "flex",
                              alignItems: "center",
                              gap: 6
                            }}>
                              <span>❌</span> Non-standard project structure
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Suggested Configuration */}
                      <div style={{
                        background: "rgba(255,255,255,0.7)",
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 20
                      }}>
                        <div style={{ fontWeight: 600, color: "#92400e", marginBottom: 12 }}>💡 Suggested Configuration:</div>
                        
                        {/* Java Version Selection */}
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#78350f", marginBottom: 6 }}>
                            {sourceVersionStatus === "detected" ? "Java version automatically detected" : "Select Source Java Version:"}
                          </label>
                          {sourceVersionStatus === "detected" && suggestedJavaVersion !== "auto" ? (
                            <div style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid #d1d5db", backgroundColor: "#f8fafc", minWidth: 200, color: "#0f172a" }}>
                              Java {suggestedJavaVersion} detected from source code
                            </div>
                          ) : (
                            <>
                              <select
                                value={suggestedJavaVersion}
                                onChange={(e) => {
                                  setSuggestedJavaVersion(e.target.value);
                                  setSelectedSourceVersion(e.target.value === "auto" ? "8" : e.target.value); // Default to 8 if auto-detect
                                  setUserSelectedVersion(e.target.value);
                                  setSourceVersionStatus("detected");
                                }}
                                style={{
                                  padding: "10px 14px",
                                  borderRadius: 6,
                                  border: "1px solid #d97706",
                                  fontSize: 14,
                                  backgroundColor: "#fff",
                                  cursor: "pointer",
                                  minWidth: 200
                                }}
                              >
                                <option value="auto">🔍 Auto-detect from code (Recommended)</option>
                                <option value="7">Java 7 (Legacy)</option>
                                <option value="8">Java 8 (LTS)</option>
                                <option value="11">Java 11 (LTS)</option>
                                <option value="17">Java 17 (LTS)</option>
                                <option value="21">Java 21 (LTS)</option>
                              </select>
                              <div style={{ fontSize: 11, color: "#a16207", marginTop: 6 }}>
                                💡 Auto-detect analyzes your code to determine the correct Java version
                              </div>
                            </>
                          )}
                        </div>

                        <div style={{ marginBottom: 16, padding: 16, borderRadius: 8, backgroundColor: "#eef2ff", border: "1px solid #c7d2fe" }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#1e3a8a" }}>
                            {buildConversionLabel}
                          </div>
                          <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                            {buildConversionNote}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div style={{ display: "flex", gap: 12 }}>
                        <button
                          onClick={() => {
                            setHighRiskConfirmed(true);
                            setSelectedSourceVersion(suggestedJavaVersion);
                          }}
                          style={{
                            backgroundColor: "#f59e0b",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "12px 24px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            gap: 8
                          }}
                        >
                          {buildConversionLabel}
                        </button>
                        <button
                          onClick={() => {
                            setStep(1);
                            setSelectedRepo(null);
                            setRepoAnalysis(null);
                            setIsJavaProject(null);
                            setIsHighRiskProject(false);
                            setRepoUrl("");
                          }}
                          style={{
                            backgroundColor: "#fff",
                            color: "#92400e",
                            border: "2px solid #f59e0b",
                            borderRadius: 8,
                            padding: "12px 24px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: 14
                          }}
                        >
                          ← Choose Different Repository
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Show content only after high-risk confirmation or if not high-risk */}
                  {(!isHighRiskProject || highRiskConfirmed) && (
                    <>
                  {/* GitHub-like File Explorer */}
                  <div style={styles.sectionTitle}>📂 Repository Files</div>
                  <div style={{
                    border: "1px solid #d0d7de",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 24,
                    backgroundColor: "#fff"
                  }}>
                    {/* Header bar like GitHub */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      backgroundColor: "#f6f8fa",
                      borderBottom: "1px solid #d0d7de"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, color: "#24292f" }}>{selectedRepo.name}</span>
                        {currentPath && (
                          <>
                            <span style={{ color: "#57606a" }}>/</span>
                            <span style={{ color: "#0969da" }}>{currentPath}</span>
                          </>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {currentPath && (
                          <button
                            onClick={navigateToRoot}
                            style={{
                              background: "none",
                              border: "1px solid #d0d7de",
                              borderRadius: 6,
                              padding: "4px 12px",
                              cursor: "pointer",
                              fontSize: 12,
                              color: "#24292f"
                            }}
                          >
                            🏠 Root
                          </button>
                        )}
                        <button
                          onClick={() => setShowFileExplorer(!showFileExplorer)}
                          style={{
                            background: "none",
                            border: "1px solid #d0d7de",
                            borderRadius: 6,
                            padding: "4px 12px",
                            cursor: "pointer",
                            fontSize: 12,
                            color: "#24292f"
                          }}
                        >
                          {showFileExplorer ? "🔽 Collapse" : "🔼 Expand"}
                        </button>
                      </div>
                    </div>

                    {showFileExplorer && (
                      <div
                        style={{
                          display: "flex",
                          minHeight: selectedFile ? 400 : 0,
                          maxHeight: selectedFile ? 500 : 208,
                          overflow: "hidden",
                        }}
                      >
                        {/* File Tree - Left Panel */}
                        <div
                          style={{
                            width: selectedFile ? "40%" : "100%",
                            borderRight: selectedFile ? "1px solid #d0d7de" : "none",
                            overflowY: "auto",
                            overflowX: "hidden",
                            maxHeight: selectedFile ? 500 : 208,
                            scrollBehavior: "smooth",
                          }}
                        >
                          {/* Back navigation */}
                          {currentPath && (
                            <div
                              onClick={navigateBack}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "10px 16px",
                                borderBottom: "1px solid #d0d7de",
                                cursor: "pointer",
                                backgroundColor: "#f6f8fa"
                              }}
                            >
                              <span>⬆️</span>
                              <span style={{ color: "#0969da", fontSize: 14 }}>..</span>
                            </div>
                          )}
                          
                          {/* File list */}
                          {repoFiles.length > 0 ? (
                            repoFiles.map((file, idx) => (
                              <div
                                key={idx}
                                onClick={() => handleFileClick(file)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "10px 16px",
                                  borderBottom: "1px solid #d0d7de",
                                  cursor: "pointer",
                                  backgroundColor: selectedFile?.path === file.path ? "#ddf4ff" : "transparent",
                                  transition: "background-color 0.15s ease"
                                }}
                                onMouseEnter={(e) => {
                                  if (selectedFile?.path !== file.path) {
                                    e.currentTarget.style.backgroundColor = "#f6f8fa";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (selectedFile?.path !== file.path) {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                  }
                                }}
                              >
                                <span style={{ fontSize: 16 }}>{getFileIcon(file)}</span>
                                <span style={{
                                  flex: 1,
                                  color: file.type === "dir" ? "#0969da" : "#24292f",
                                  fontWeight: file.type === "dir" ? 600 : 400,
                                  fontSize: 14
                                }}>
                                  {file.name}
                                </span>
                                {file.type === "file" && file.size > 0 && (
                                  <span style={{ fontSize: 12, color: "#57606a" }}>
                                    {file.size < 1024 ? `${file.size} B` : `${Math.round(file.size / 1024)} KB`}
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: 20, textAlign: "center", color: "#57606a" }}>
                              No files found
                            </div>
                          )}
                        </div>

                        {/* File Content - Right Panel */}
                        {selectedFile && (
                          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            {/* File header */}
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 16px",
                              backgroundColor: "#f6f8fa",
                              borderBottom: "1px solid #d0d7de"
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span>{getFileIcon(selectedFile)}</span>
                                <span style={{ fontWeight: 600, color: "#24292f" }}>{selectedFile.name}</span>
                                <span style={{
                                  fontSize: 11,
                                  padding: "2px 8px",
                                  backgroundColor: "#ddf4ff",
                                  borderRadius: 12,
                                  color: "#0969da"
                                }}>
                                  {getFileLanguage(selectedFile.name)}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={() => {
                                    setSelectedFile(null);
                                    setFileContent("");
                                    setEditedContent("");
                                    setIsEditing(false);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "1px solid #d0d7de",
                                    borderRadius: 6,
                                    padding: "6px 12px",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    color: "#24292f"
                                  }}
                                >
                                  ✖️ Close
                                </button>
                              </div>
                            </div>

                            {/* File content */}
                            <div style={{
                              flex: 1,
                              overflow: "auto",
                              backgroundColor: "#0d1117",
                              position: "relative"
                            }}>
                              {fileLoading ? (
                                <div style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  height: "100%",
                                  color: "#8b949e"
                                }}>
                                  <div style={styles.spinner}></div>
                                  <span style={{ marginLeft: 10 }}>Loading file...</span>
                                </div>
                              ) : isEditing ? (
                                <textarea
                                  value={editedContent}
                                  onChange={(e) => setEditedContent(e.target.value)}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    minHeight: 350,
                                    padding: 16,
                                    backgroundColor: "#0d1117",
                                    color: "#c9d1d9",
                                    border: "none",
                                    outline: "none",
                                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    resize: "none",
                                    boxSizing: "border-box"
                                  }}
                                />
                              ) : (
                                <pre style={{
                                  margin: 0,
                                  padding: 16,
                                  color: "#c9d1d9",
                                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                                  fontSize: 13,
                                  lineHeight: 1.5,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word"
                                }}>
                                  {fileContent || "// Empty file"}
                                </pre>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Discovery Info */}
                  <div style={styles.discoveryContent}>
                    <div className="inner-card-hover discovery-inner-card" style={styles.discoveryItem}>
                      <span style={styles.discoveryIcon}>📊</span>
                      <div>
                        <div style={styles.discoveryTitle}>Repository Analysis</div>
                        <div style={styles.discoveryDesc}>Scanning {selectedRepo.name} for Java components</div>
                      </div>
                    </div>
                    <div className="inner-card-hover discovery-inner-card" style={styles.discoveryItem}>
                      <span style={styles.discoveryIcon}>🔧</span>
                      <div>
                        <div style={styles.discoveryTitle}>Build Tool: {repoAnalysis?.build_tool || "Detecting..."}</div>
                        <div style={styles.discoveryDesc}>Identified build system for dependency management</div>
                      </div>
                    </div>
                    <div className="inner-card-hover discovery-inner-card" style={styles.discoveryItem}>
                      <span style={styles.discoveryIcon}>☕</span>
                      <div>
                        <div style={styles.discoveryTitle}>Java Version: {(repoAnalysis?.java_version || repoAnalysis?.java_version_from_build) || "Detecting..."}</div>
                        <div style={styles.discoveryDesc}>Current Java version detected in the project</div>
                      </div>
                    </div>
                  </div>

                  {(detectedJavaVersion || detectedBuildType) && (
                    <div className="inner-card-hover discovery-inner-card" style={styles.detectedConfigCard}>
                      <div style={styles.detectedConfigHeader}>
                        <div>
                          <div style={styles.detectedConfigTitle}>Detected Configuration</div>
                          <div style={styles.detectedConfigSubtitle}>
                            Restored discovery summary for the detected Java and build setup.
                          </div>
                        </div>
                      </div>

                      <div style={styles.detectedConfigActions}>
                        <button type="button" style={styles.detectedConfigChip}>
                          Java Version Detected: {detectedJavaVersion ? `Java ${detectedJavaVersion}` : "Unknown"}
                        </button>
                        <button type="button" style={styles.detectedConfigChip}>
                          Build Detected: {detectedBuildType ? detectedBuildType.charAt(0).toUpperCase() + detectedBuildType.slice(1) : "Unknown"}
                        </button>
                        <button type="button" style={styles.detectedConfigChip}>
                          Framework Detected: {primaryDetectedFramework || "None detected"}
                        </button>
                        {hasRecommendedBuildConversion && recommendedBuildConversionId && (
                          <button
                            type="button"
                            style={{
                              ...styles.detectedConfigActionBtn,
                              ...(selectedConversions.includes(recommendedBuildConversionId)
                                ? styles.detectedConfigActionBtnActive
                                : {}),
                            }}
                            onClick={applyRecommendedBuildConversion}
                          >
                            {selectedConversions.includes(recommendedBuildConversionId)
                              ? `${buildConversionLabel} Selected`
                              : buildConversionLabel}
                          </button>
                        )}
                      </div>

                      <div style={styles.detectedConfigNote}>{buildConversionNote}</div>
                    </div>
                  )}

                  {/* Framework Detection - Clickable with File Preview */}
                  <div style={styles.sectionTitle}>🎯 Detected Frameworks & Libraries</div>
                  
                  {/* Framework File Viewer Modal */}
                  {viewingFrameworkFile && (
                    <div style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0,0,0,0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1000
                    }}>
                      <div style={{
                        backgroundColor: "#fff",
                        borderRadius: 12,
                        width: "80%",
                        maxWidth: 900,
                        maxHeight: "85vh",
                        overflow: "hidden",
                        boxShadow: "0 25px 50px rgba(0,0,0,0.3)"
                      }}>
                        {/* Modal Header */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "16px 20px",
                          backgroundColor: "#f6f8fa",
                          borderBottom: "1px solid #d0d7de"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 20 }}>📄</span>
                            <div>
                              <div style={{ fontWeight: 600, color: "#24292f" }}>{viewingFrameworkFile.name}</div>
                              <div style={{ fontSize: 12, color: "#57606a" }}>{viewingFrameworkFile.path}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              fontSize: 11,
                              padding: "4px 10px",
                              backgroundColor: "#ddf4ff",
                              borderRadius: 12,
                              color: "#0969da"
                            }}>
                              Read Only
                            </span>
                            <button
                              onClick={() => setViewingFrameworkFile(null)}
                              style={{
                                background: "none",
                                border: "1px solid #d0d7de",
                                borderRadius: 6,
                                padding: "6px 12px",
                                cursor: "pointer",
                                fontSize: 14,
                                color: "#24292f"
                              }}
                            >
                              ✖️ Close
                            </button>
                          </div>
                        </div>
                        {/* Modal Content */}
                        <div style={{
                          backgroundColor: "#0d1117",
                          overflow: "auto",
                          maxHeight: "calc(85vh - 70px)"
                        }}>
                          {frameworkFileLoading ? (
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 60,
                              color: "#8b949e"
                            }}>
                              <div style={styles.spinner}></div>
                              <span style={{ marginLeft: 12 }}>Loading file content...</span>
                            </div>
                          ) : (
                            <pre style={{
                              margin: 0,
                              padding: 20,
                              color: "#c9d1d9",
                              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                              fontSize: 13,
                              lineHeight: 1.6,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word"
                            }}>
                              {viewingFrameworkFile.content || "// File content unavailable"}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Detected Frameworks Grid - Clickable */}
                  {detectedFrameworks.length > 0 ? (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: 12,
                      marginBottom: 20
                    }}>
                      {detectedFrameworks.map((fw, idx) => (
                        <div
                          key={idx}
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
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "14px 16px",
                            backgroundColor: "#fff",
                            border: "1px solid #d0d7de",
                            borderRadius: 8,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f6f8fa";
                            e.currentTarget.style.borderColor = "#0969da";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(9, 105, 218, 0.15)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#fff";
                            e.currentTarget.style.borderColor = "#d0d7de";
                            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 24 }}>
                              {fw.type === "Testing Framework" ? "🧪" : 
                               fw.type === "Application Framework" ? "🍃" : 
                               fw.type === "ORM Framework" ? "🗄️" :
                               fw.type === "Logging" ? "📝" :
                               fw.type === "Mocking Framework" ? "🎭" :
                               fw.type === "JSON Processing" ? "📦" : "📚"}
                            </span>
                            <div>
                              <div style={{ fontWeight: 600, color: "#24292f", fontSize: 14 }}>{fw.name}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 11, color: "#57606a" }}>{fw.type}</span>
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: "0.04em",
                                  textTransform: "uppercase",
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  backgroundColor: getDetectedComponentCategory(fw.type) === "Framework" ? "#ede9fe" : "#e0f2fe",
                                  color: getDetectedComponentCategory(fw.type) === "Framework" ? "#6d28d9" : "#075985",
                                  border: getDetectedComponentCategory(fw.type) === "Framework" ? "1px solid #c4b5fd" : "1px solid #bae6fd"
                                }}>
                                  {getDetectedComponentCategory(fw.type)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              fontSize: 11,
                              padding: "3px 8px",
                              backgroundColor: "#dcfce7",
                              borderRadius: 10,
                              color: "#166534"
                            }}>
                              Detected
                            </span>
                            <span style={{ color: "#0969da", fontSize: 12 }}>📂 View</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.frameworkGrid}>
                      <div className="inner-card-hover framework-inner-card" style={styles.frameworkItem}>
                        <span>🍃</span>
                        <span>Spring Boot</span>
                        {repoAnalysis?.dependencies?.some(d => d.artifact_id.includes('spring')) && <span style={styles.detectedBadge}>Detected</span>}
                      </div>
                      <div className="inner-card-hover framework-inner-card" style={styles.frameworkItem}>
                        <span>🗄️</span>
                        <span>JPA/Hibernate</span>
                        {repoAnalysis?.dependencies?.some(d => d.artifact_id.includes('hibernate') || d.artifact_id.includes('jpa')) && <span style={styles.detectedBadge}>Detected</span>}
                      </div>
                      <div className="inner-card-hover framework-inner-card" style={styles.frameworkItem}>
                        <span>🧪</span>
                        <span>JUnit</span>
                        {repoAnalysis?.dependencies?.some(d => d.artifact_id.includes('junit')) && <span style={styles.detectedBadge}>Detected</span>}
                      </div>
                      <div className="inner-card-hover framework-inner-card" style={styles.frameworkItem}>
                        <span>📝</span>
                        <span>Log4j/SLF4J</span>
                        {repoAnalysis?.dependencies?.some(d => d.artifact_id.includes('log4j') || d.artifact_id.includes('slf4j')) && <span style={styles.detectedBadge}>Detected</span>}
                      </div>
                    </div>
                  )}

                  {repoAnalysis && (
                    <div className="inner-card-hover discovery-inner-card" style={styles.structureBox}>
                      <div style={styles.structureTitle}>Project Structure Summary</div>
                      <div style={styles.structureGrid}>
                        <span style={repoAnalysis.structure?.has_pom_xml ? styles.structureFound : styles.structureMissing}>{repoAnalysis.structure?.has_pom_xml ? "✓" : "✗"} pom.xml</span>
                        <span style={repoAnalysis.structure?.has_build_gradle ? styles.structureFound : styles.structureMissing}>{repoAnalysis.structure?.has_build_gradle ? "✓" : "✗"} build.gradle</span>
                        <span style={repoAnalysis.structure?.has_src_main ? styles.structureFound : styles.structureMissing}>{repoAnalysis.structure?.has_src_main ? "✓" : "✗"} src/main</span>
                        <span style={repoAnalysis.structure?.has_src_test ? styles.structureFound : styles.structureMissing}>{repoAnalysis.structure?.has_src_test ? "✓" : "✗"} src/test</span>
                        <span style={detectedJavaVersion ? styles.structureFound : styles.structureMissing}>{detectedJavaStructureLabel}</span>
                      </div>
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

      <div style={styles.btnRow}>
        <button style={styles.secondaryBtn} onClick={() => setStep(1)}>← Back</button>
        <button 
          style={{ ...styles.primaryBtn, opacity: isJavaProject === false || (isHighRiskProject && !highRiskConfirmed) || analysisLoading || !repoAnalysis ? 0.5 : 1 }} 
          onClick={() => setStep(3)}
          disabled={isJavaProject === false || (isHighRiskProject && !highRiskConfirmed) || analysisLoading || !repoAnalysis}
        >
          Continue to Strategy →
        </button>
      </div>
    </div>
    );
  };

  return renderDiscoveryStep();
}
