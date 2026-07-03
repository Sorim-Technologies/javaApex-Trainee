import React from "react";
import { styles } from "../../pages/styles";
import type { CodeChangeEntry } from "../../types/migration";

interface GeneratedFilesProps {
  codeChanges: CodeChangeEntry[];
  selectedDiffFile: string | null;
  setSelectedDiffFile: (val: string | null) => void;
  showCodeChanges: boolean;
  setShowCodeChanges: (val: boolean) => void;
}

export function GeneratedFiles({
  codeChanges,
  selectedDiffFile,
  setSelectedDiffFile,
  showCodeChanges,
  setShowCodeChanges,
}: GeneratedFilesProps) {
  return (
    <div style={styles.reportSection}>
      <h3 style={styles.reportTitle}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <span>📝 Code Changes (GitLab-Style Diff)</span>
          <button
            onClick={() => setShowCodeChanges(!showCodeChanges)}
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
            {showCodeChanges ? "🔽 Collapse" : "🔼 Expand"}
          </button>
        </span>
      </h3>

      {showCodeChanges && (
        <div
          style={{
            border: "1px solid #d0d7de",
            borderRadius: 8,
            overflow: "hidden",
            backgroundColor: "#fff",
          }}
        >
          {/* File List Header */}
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
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontWeight: 600, color: "#24292f" }}>{codeChanges.length} files changed</span>
              <span style={{ color: "#22c55e", fontSize: 13 }}>
                +{codeChanges.reduce((sum, c) => sum + c.additions, 0)} additions
              </span>
              <span style={{ color: "#ef4444", fontSize: 13 }}>
                -{codeChanges.reduce((sum, c) => sum + c.deletions, 0)} deletions
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                padding: "4px 10px",
                backgroundColor: "#ddf4ff",
                borderRadius: 12,
                color: "#0969da",
              }}
            >
              Read Only
            </span>
          </div>

          {/* File List */}
          <div style={{ maxHeight: 600, overflowY: "auto" }}>
            {codeChanges.map((change, idx) => (
              <div key={idx}>
                {/* File Header */}
                <div
                  onClick={() =>
                    setSelectedDiffFile(selectedDiffFile === change.filePath ? null : change.filePath)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    backgroundColor: selectedDiffFile === change.filePath ? "#f0f6fc" : "#fafbfc",
                    borderBottom: "1px solid #d0d7de",
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14 }}>
                      {selectedDiffFile === change.filePath ? "▼" : "▶"}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor:
                          change.changeType === "added"
                            ? "#dcfce7"
                            : change.changeType === "deleted"
                            ? "#fee2e2"
                            : "#fef3c7",
                        color:
                          change.changeType === "added"
                            ? "#166534"
                            : change.changeType === "deleted"
                            ? "#991b1b"
                            : "#92400e",
                      }}
                    >
                      {change.changeType.toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                        fontSize: 13,
                        color: "#0969da",
                      }}
                    >
                      {change.filePath}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 600 }}>
                      +{change.additions}
                    </span>
                    <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}>
                      -{change.deletions}
                    </span>
                  </div>
                </div>

                {/* Diff Content */}
                {selectedDiffFile === change.filePath && (
                  <div
                    style={{
                      backgroundColor: "#0d1117",
                      borderBottom: "1px solid #d0d7de",
                      overflowX: "auto",
                    }}
                  >
                    {/* Diff Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 16px",
                        backgroundColor: "#161b22",
                        borderBottom: "1px solid #30363d",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                          fontSize: 12,
                          color: "#8b949e",
                        }}
                      >
                        {change.fileName}
                      </span>
                      <div style={{ display: "flex", gap: 12 }}>
                        <span style={{ fontSize: 11, color: "#3fb950" }}>+{change.additions} lines</span>
                        <span style={{ fontSize: 11, color: "#f85149" }}>-{change.deletions} lines</span>
                      </div>
                    </div>

                    {/* Diff Lines */}
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      {change.diffLines.map((line, lineIdx) => (
                        <div
                          key={lineIdx}
                          style={{
                            display: "flex",
                            backgroundColor:
                              line.type === "add"
                                ? "rgba(63, 185, 80, 0.15)"
                                : line.type === "remove"
                                ? "rgba(248, 81, 73, 0.15)"
                                : "transparent",
                            borderLeft: `4px solid ${
                              line.type === "add" ? "#3fb950" : line.type === "remove" ? "#f85149" : "transparent"
                            }`,
                          }}
                        >
                          {/* Line Number */}
                          <span
                            style={{
                              minWidth: 50,
                              padding: "2px 10px",
                              textAlign: "right",
                              color: "#6e7681",
                              backgroundColor:
                                line.type === "add"
                                  ? "rgba(63, 185, 80, 0.1)"
                                  : line.type === "remove"
                                  ? "rgba(248, 81, 73, 0.1)"
                                  : "#161b22",
                              borderRight: "1px solid #30363d",
                              userSelect: "none",
                            }}
                          >
                            {line.lineNumber}
                          </span>
                          {/* Diff Symbol */}
                          <span
                            style={{
                              minWidth: 20,
                              padding: "2px 6px",
                              textAlign: "center",
                              color:
                                line.type === "add"
                                  ? "#3fb950"
                                  : line.type === "remove"
                                  ? "#f85149"
                                  : "#8b949e",
                              fontWeight: 600,
                              userSelect: "none",
                            }}
                          >
                            {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                          </span>
                          {/* Code Content */}
                          <span
                            style={{
                              flex: 1,
                              padding: "2px 10px",
                              color:
                                line.type === "add"
                                  ? "#aff5b4"
                                  : line.type === "remove"
                                  ? "#ffa198"
                                  : "#c9d1d9",
                              whiteSpace: "pre",
                            }}
                          >
                            {line.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {codeChanges.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#57606a" }}>
                No code changes to display
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GeneratedFiles;
