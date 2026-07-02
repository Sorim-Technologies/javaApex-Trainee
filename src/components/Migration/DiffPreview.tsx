import React from "react";
import type { MigrationStepProps } from "./MigrationTypes";

type DiffPreviewProps = Pick<
  MigrationStepProps,
  | "migrationPreviewLoading"
  | "migrationPreviewError"
  | "migrationPreview"
  | "codeChanges"
  | "selectedDiffFile"
  | "setSelectedDiffFile"
>;

export function DiffPreview({
  migrationPreviewLoading,
  migrationPreviewError,
  migrationPreview,
  codeChanges,
  selectedDiffFile,
  setSelectedDiffFile,
}: DiffPreviewProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>
        Preview code changes
      </div>
      <div style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, backgroundColor: "#fff" }}>
        {migrationPreviewLoading && (
          <div style={{ fontSize: 14, color: "#475569" }}>
            Analyzing the connected repository and building a real migration preview...
          </div>
        )}

        {!migrationPreviewLoading && migrationPreviewError && (
          <div style={{ fontSize: 14, color: "#b91c1c" }}>{migrationPreviewError}</div>
        )}

        {!migrationPreviewLoading && !migrationPreviewError && migrationPreview && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {migrationPreview.summary.files_to_modify} files to modify
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  backgroundColor: "#ecfdf5",
                  color: "#047857",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {migrationPreview.summary.total_changes} planned changes
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  backgroundColor: "rgba(168, 85, 247, 0.15)",
                  color: "#d8b4fe",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {migrationPreview.file_diffs.length} preview diffs
              </div>
            </div>

            {codeChanges.length > 0 ? (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    backgroundColor: "#ffffff",
                    borderBottom: "1px solid rgba(226, 232, 240, 0.15)",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    Repo-specific migration diff preview
                  </span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Read only</span>
                </div>
                <div style={{ maxHeight: 420, overflowY: "auto" }}>
                  {codeChanges.map((change, idx) => (
                    <div key={idx}>
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
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 14 }}>
                            {selectedDiffFile === change.filePath ? "▼" : "▶"}
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

                      {selectedDiffFile === change.filePath && (
                        <div style={{ backgroundColor: "#0d1117", overflowX: "auto" }}>
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
                                <span
                                  style={{
                                    minWidth: 50,
                                    padding: "2px 10px",
                                    textAlign: "right",
                                    color: "#6e7681",
                                    backgroundColor: "rgba(110,118,129,0.1)",
                                    userSelect: "none",
                                  }}
                                >
                                  {line.lineNumber}
                                </span>
                                <span
                                  style={{
                                    width: 24,
                                    padding: "2px 6px",
                                    textAlign: "center",
                                    color:
                                      line.type === "add"
                                        ? "#3fb950"
                                        : line.type === "remove"
                                        ? "#f85149"
                                        : "#8b949e",
                                    userSelect: "none",
                                  }}
                                >
                                  {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                                </span>
                                <span
                                  style={{ flex: 1, padding: "2px 12px", color: "#e6edf3", whiteSpace: "pre" }}
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
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: "#475569" }}>
                No file-level diff preview is available for this repository yet.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DiffPreview;
