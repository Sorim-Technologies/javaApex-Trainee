import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";
import ConnectPage from "./ConnectPage";

export default function ConnectWizardStep({ context }: { context: WizardScreenContext }) {
  const {
    currentToken,
    githubToken,
    handlePatModalContinue,
    handleRepositoryContinue,
    handleZipContinue,
    handleZipDrop,
    handleZipFileChange,
    isPrivateRepo,
    patToken,
    patTokenError,
    repoAccessCheckLoading,
    repoUrl,
    selectedZipFile,
    setError,
    setGithubToken,
    setIsPrivateRepo,
    setPatToken,
    setPatTokenError,
    setRepoAnalysis,
    setRepoUrl,
    setSelectedRepo,
    setShowPatModal,
    setShowPatToken,
    setSourceInputType,
    setZipDragActive,
    showEnterpriseToken,
    showPatModal,
    showPatToken,
    sourceInputType,
    styles,
    urlValidation,
    zipDragActive,
    zipUploadMessage,
    zipUploadProgress,
    zipUploadStatus,
  } = context;

  const renderConnectStep = () => {
    return (
      <ConnectPage
        styles={styles}
        sourceInputType={sourceInputType}
        isPrivateRepo={isPrivateRepo}
        repoUrl={repoUrl}
        urlValidation={urlValidation}
        repoAccessCheckLoading={repoAccessCheckLoading}
        currentToken={currentToken}
        showEnterpriseToken={showEnterpriseToken}
        githubToken={githubToken}
        patToken={patToken}
        showPatModal={showPatModal}
        showPatToken={showPatToken}
        patTokenError={patTokenError}
        selectedZipFile={selectedZipFile}
        zipUploadStatus={zipUploadStatus}
        zipDragActive={zipDragActive}
        zipUploadProgress={zipUploadProgress}
        zipUploadMessage={zipUploadMessage}
        onSourceInputTypeChange={setSourceInputType}
        onPrivateRepoChange={setIsPrivateRepo}
        onPatModalChange={setShowPatModal}
        onPatTokenErrorChange={setPatTokenError}
        onErrorChange={setError}
        onRepoUrlChange={setRepoUrl}
        onGithubTokenChange={setGithubToken}
        onPatTokenChange={setPatToken}
        onShowPatTokenChange={setShowPatToken}
        onSelectedRepoReset={() => setSelectedRepo(null)}
        onRepoAnalysisReset={() => setRepoAnalysis(null)}
        onZipDragActiveChange={setZipDragActive}
        onZipFileChange={handleZipFileChange}
        onZipDrop={handleZipDrop}
        onRepositoryContinue={() => void handleRepositoryContinue()}
        onZipContinue={() => void handleZipContinue()}
        onPatModalContinue={handlePatModalContinue}
      />
    );

    const repositorySourceMode = sourceInputType === "zip" ? "zip" : isPrivateRepo ? "private" : "public";
    const isGithubSelected = sourceInputType === "github";
    const isZipSelected = sourceInputType === "zip";
    const tokenValue = showEnterpriseToken ? githubToken : patToken;
    const repoStatusMessage = !repoUrl
      ? ""
      : urlValidation.valid
        ? "✅ Valid Repository"
        : "❌ Invalid Repository";
    const canContinueRepository =
      urlValidation.valid &&
      !repoAccessCheckLoading &&
      (!isPrivateRepo || Boolean(currentToken.trim()));

    const sourceOptionStyle = (active: boolean, accent = "#3b82f6") => ({
      padding: "16px",
      borderRadius: 12,
      border: active ? `2px solid ${accent}` : "1px solid #dbe3ef",
      background: active ? "#eff6ff" : "#ffffff",
      cursor: "pointer",
      textAlign: "left" as const,
      transition: "all 0.2s ease",
      minHeight: 104,
    });

    const sourceTitleStyle = (active: boolean, color = "#1d4ed8") => ({
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontWeight: 800,
      color: active ? color : "#0f172a",
      fontSize: 15,
    });

    return (
      <div style={styles.card}>
        <div style={styles.stepHeader}>
          <span style={styles.stepIcon}>{isZipSelected ? "📦" : isPrivateRepo ? "🔒" : "🔗"}</span>
          <div>
            <h2 style={styles.title}>Connect Repository</h2>
            <p style={styles.subtitle}>Choose one source and the wizard will handle access automatically.</p>
          </div>
        </div>

        <div className="source-option-tabs" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            className={`source-option-tab ${repositorySourceMode === "public" ? "source-option-tab--active" : ""}`}
            onClick={() => {
              setSourceInputType("github");
              setIsPrivateRepo(false);
              setShowPatModal(false);
              setPatTokenError("");
              setError("");
            }}
            style={sourceOptionStyle(repositorySourceMode === "public")}
          >
            <div style={sourceTitleStyle(repositorySourceMode === "public")}>
              <span>🔗</span>
              Public GitHub Repository
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              Paste a repository URL and continue without a token.
            </div>
          </button>

          <button
            type="button"
            className={`source-option-tab ${repositorySourceMode === "private" ? "source-option-tab--active" : ""}`}
            onClick={() => {
              setSourceInputType("github");
              setIsPrivateRepo(true);
              setError("");
              if (urlValidation.valid && !currentToken.trim()) {
                setPatTokenError("");
                setShowPatModal(true);
              }
            }}
            style={sourceOptionStyle(repositorySourceMode === "private")}
          >
            <div style={sourceTitleStyle(repositorySourceMode === "private")}>
              <span>🔒</span>
              Private GitHub Repository
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              Use a GitHub PAT only when private access is required.
            </div>
          </button>

          <button
            type="button"
            className={`source-option-tab ${repositorySourceMode === "zip" ? "source-option-tab--active" : ""}`}
            onClick={() => {
              setSourceInputType("zip");
              setShowPatModal(false);
              setError("");
            }}
            style={sourceOptionStyle(repositorySourceMode === "zip", "#f59e0b")}
          >
            <div style={sourceTitleStyle(repositorySourceMode === "zip", "#b45309")}>
              <span>📦</span>
              Upload Local ZIP
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              Drop or browse for a local .zip project.
            </div>
          </button>
        </div>

        {isGithubSelected && (
          <>
            <div style={styles.field}>
              <label style={styles.label}>Repository URL</label>
              <input
                type="text"
                style={{ ...styles.input, borderColor: urlValidation.valid ? "#22c55e" : repoUrl ? "#ef4444" : "#e2e8f0" }}
                value={repoUrl}
                onChange={(event) => {
                  setRepoUrl(event.target.value);
                  setSelectedRepo(null);
                  setRepoAnalysis(null);
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canContinueRepository) {
                    void handleRepositoryContinue();
                  }
                }}
                placeholder="https://github.com/owner/repository"
              />
              {repoStatusMessage && (
                <div style={{ fontSize: 12, color: urlValidation.valid ? "#16a34a" : "#dc2626", marginTop: 8, fontWeight: 700 }}>
                  {repoStatusMessage}
                </div>
              )}
              {repoAccessCheckLoading && (
                <div style={{ fontSize: 12, color: "#2563eb", marginTop: 8, fontWeight: 600 }}>
                  Checking repository access...
                </div>
              )}
              {!repoAccessCheckLoading && isPrivateRepo && currentToken.trim() && (
                <div style={{ fontSize: 12, color: "#16a34a", marginTop: 8, fontWeight: 700 }}>
                  Token added for private repository access.
                </div>
              )}
            </div>

            <div style={styles.btnRow}>
              <button
                style={{ ...styles.primaryBtn, opacity: canContinueRepository ? 1 : 0.5 }}
                disabled={!canContinueRepository}
                onClick={() => void handleRepositoryContinue()}
              >
                Continue →
              </button>
            </div>
          </>
        )}

        {isZipSelected && (
          <>
            <div style={styles.field}>
              <label style={styles.label}>Upload Local ZIP</label>
              <label
                className={`zip-upload-box ${zipUploadStatus === "ready" ? "zip-upload-box--ready" : ""} ${zipUploadStatus === "error" ? "zip-upload-box--error" : ""} ${zipUploadStatus === "success" ? "zip-upload-box--success" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (zipUploadStatus !== "uploading") setZipDragActive(true);
                }}
                onDragLeave={() => setZipDragActive(false)}
                onDrop={handleZipDrop}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  minHeight: 170,
                  padding: "26px",
                  border: `2px dashed ${zipDragActive ? "#2563eb" : zipUploadStatus === "error" ? "#ef4444" : zipUploadStatus === "success" || zipUploadStatus === "ready" ? "#22c55e" : "#cbd5e1"}`,
                  borderRadius: 14,
                  background: zipDragActive ? "#eff6ff" : zipUploadStatus === "error" ? "#fef2f2" : zipUploadStatus === "success" || zipUploadStatus === "ready" ? "#f0fdf4" : "#f8fafc",
                  cursor: zipUploadStatus === "uploading" ? "not-allowed" : "pointer",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  disabled={zipUploadStatus === "uploading"}
                  onChange={handleZipFileChange}
                  style={{ display: "none" }}
                />
                <div style={{ fontSize: 34 }}>{zipUploadStatus === "success" ? "✅" : zipUploadStatus === "error" ? "⚠️" : "📦"}</div>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>
                  {selectedZipFile ? selectedZipFile.name : "Drop a .zip file here or click to browse"}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  Only .zip files are accepted.
                </div>
              </label>

              {(zipUploadStatus === "uploading" || zipUploadStatus === "success") && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "#475569", fontWeight: 700 }}>
                    <span>{zipUploadStatus === "success" ? "Upload complete" : "Uploading..."}</span>
                    <span>{zipUploadProgress}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "#e2e8f0" }}>
                    <div style={{ width: `${zipUploadProgress}%`, height: "100%", background: "#2563eb", transition: "width 0.25s ease" }} />
                  </div>
                </div>
              )}

              {zipUploadMessage && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: zipUploadStatus === "error" ? "#dc2626" : zipUploadStatus === "success" || zipUploadStatus === "ready" ? "#16a34a" : "#475569",
                    fontWeight: zipUploadStatus === "error" || zipUploadStatus === "success" || zipUploadStatus === "ready" ? 700 : 500,
                  }}
                >
                  {zipUploadStatus === "uploading" ? "⏳ " : zipUploadStatus === "success" || zipUploadStatus === "ready" ? "✓ " : zipUploadStatus === "error" ? "⚠️ " : ""}
                  {zipUploadMessage}
                </div>
              )}
            </div>

            <div style={styles.btnRow}>
              <button
                style={{ ...styles.primaryBtn, opacity: selectedZipFile && zipUploadStatus !== "uploading" ? 1 : 0.5 }}
                disabled={!selectedZipFile || zipUploadStatus === "uploading"}
                onClick={() => void handleZipContinue()}
              >
                {zipUploadStatus === "uploading" ? "Uploading..." : "Upload & Continue →"}
              </button>
            </div>
          </>
        )}

        {showPatModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pat-modal-title"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 2000,
            }}
          >
            <div style={{ width: "min(460px, 100%)", background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 24px 60px rgba(15,23,42,0.25)" }}>
              <h3 id="pat-modal-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                GitHub Personal Access Token
              </h3>
              <p style={{ margin: "8px 0 18px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                This repository needs authenticated access. Paste a PAT with repository read access to continue.
              </p>
              <label style={styles.label}>Personal Access Token</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type={showPatToken ? "text" : "password"}
                  value={tokenValue}
                  onChange={(event) => {
                    if (showEnterpriseToken) {
                      setGithubToken(event.target.value);
                    } else {
                      setPatToken(event.target.value);
                    }
                    setPatTokenError("");
                  }}
                  placeholder="Paste your GitHub PAT"
                  autoComplete="off"
                  style={{ ...styles.input, flex: 1, borderColor: patTokenError ? "#ef4444" : "#e2e8f0" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPatToken((value) => !value)}
                  style={{
                    minWidth: 76,
                    border: "1px solid #dbe3ef",
                    borderRadius: 8,
                    background: "#fff",
                    color: "#334155",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {showPatToken ? "Hide" : "Show"}
                </button>
              </div>
              {patTokenError && (
                <div style={{ marginTop: 8, color: "#dc2626", fontSize: 12, fontWeight: 700 }}>
                  {patTokenError}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPatModal(false);
                    setPatTokenError("");
                    if (!currentToken.trim()) {
                      setIsPrivateRepo(false);
                    }
                  }}
                  style={{ ...styles.secondaryBtn, padding: "11px 18px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePatModalContinue}
                  disabled={!tokenValue.trim()}
                  style={{ ...styles.primaryBtn, padding: "11px 18px", opacity: tokenValue.trim() ? 1 : 0.5 }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return renderConnectStep();
}
