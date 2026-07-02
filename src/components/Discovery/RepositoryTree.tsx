import React from "react";
import { FiFolder, FiHome, FiChevronDown, FiChevronUp, FiArrowUp } from "react-icons/fi";
import { getFileLanguage, getFileIcon } from "./DiscoveryHelpers";
import { styles } from "../../pages/styles";
import type { RepoFile, RepoInfo } from "../../types/migration";

interface RepositoryTreeProps {
  selectedRepo: RepoInfo;
  currentPath: string;
  navigateToRoot: () => void;
  showFileExplorer: boolean;
  setShowFileExplorer: (val: boolean) => void;
  navigateBack: () => void;
  repoFiles: RepoFile[];
  handleFileClick: (file: RepoFile) => void;
  selectedFile: RepoFile | null;
  setSelectedFile: (val: RepoFile | null) => void;
  fileLoading: boolean;
  isEditing: boolean;
  editedContent: string;
  setEditedContent: (val: string) => void;
  fileContent: string;
}

export function RepositoryTree({
  selectedRepo,
  currentPath,
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
}: RepositoryTreeProps) {
  return (
    <>
      <div style={styles.sectionTitle}>
        <FiFolder size={20} />
        <span>Repository Files</span>
      </div>
      <div
        style={{
          border: "1px solid #d0d7de",
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: 24,
          backgroundColor: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            backgroundColor: "#f6f8fa",
            borderBottom: "1px solid #d0d7de",
          }}
        >
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
                  color: "#24292f",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FiHome size={14} />
                Root
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
                color: "#24292f",
              }}
            >
              {showFileExplorer ? (
                <>
                  <FiChevronDown size={16} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Collapse
                </>
              ) : (
                <>
                  <FiChevronUp size={16} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Expand
                </>
              )}
            </button>
          </div>
        </div>

        {showFileExplorer && (
          <div style={{ display: "flex", minHeight: 400 }}>
            <div
              style={{
                width: selectedFile ? "40%" : "100%",
                borderRight: selectedFile ? "1px solid #d0d7de" : "none",
                overflowY: "auto",
                maxHeight: 500,
              }}
            >
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
                    backgroundColor: "#f6f8fa",
                  }}
                >
                  <span>
                    <FiArrowUp size={16} />
                  </span>
                  <span style={{ color: "#0969da", fontSize: 14 }}>..</span>
                </div>
              )}

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
                      backgroundColor:
                        selectedFile?.path === file.path ? "#ddf4ff" : "transparent",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{getFileIcon(file)}</span>
                    <span
                      style={{
                        flex: 1,
                        color: file.type === "dir" ? "#0969da" : "#24292f",
                        fontWeight: file.type === "dir" ? 600 : 400,
                        fontSize: 14,
                      }}
                    >
                      {file.name}
                    </span>
                    {file.type === "file" && file.size > 0 && (
                      <span style={{ fontSize: 12, color: "#57606a" }}>
                        {file.size < 1024
                          ? `${file.size} B`
                          : `${Math.round(file.size / 1024)} KB`}
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

            {selectedFile && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 16px",
                    backgroundColor: "#f6f8fa",
                    borderBottom: "1px solid #d0d7de",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{getFileIcon(selectedFile)}</span>
                    <span style={{ fontWeight: 600, color: "#24292f" }}>
                      {selectedFile.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        backgroundColor: "#ddf4ff",
                        borderRadius: 12,
                        color: "#0969da",
                      }}
                    >
                      {getFileLanguage(selectedFile.name)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setSelectedFile(null)}
                      style={{
                        background: "none",
                        border: "1px solid #d0d7de",
                        borderRadius: 6,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: "#24292f",
                      }}
                    >
                      ✖️ Close
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflow: "auto",
                    backgroundColor: "#0d1117",
                    position: "relative",
                  }}
                >
                  {fileLoading ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "#8b949e",
                      }}
                    >
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
                        boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    <pre
                      style={{
                        margin: 0,
                        padding: 16,
                        color: "#c9d1d9",
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                        fontSize: 13,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {fileContent || "// Empty file"}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default RepositoryTree;
