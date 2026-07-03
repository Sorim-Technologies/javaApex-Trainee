import React from "react";
import { FiX } from "react-icons/fi";
import { styles } from "../../pages/styles";

interface FrameworkFileModalProps {
  viewingFrameworkFile: { name: string; path: string; content: string } | null;
  setViewingFrameworkFile: (val: { name: string; path: string; content: string } | null) => void;
  frameworkFileLoading: boolean;
}

export function FrameworkFileModal({
  viewingFrameworkFile,
  setViewingFrameworkFile,
  frameworkFileLoading,
}: FrameworkFileModalProps) {
  if (!viewingFrameworkFile) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          width: "80%",
          maxWidth: 900,
          maxHeight: "85vh",
          overflow: "hidden",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            backgroundColor: "#f6f8fa",
            borderBottom: "1px solid #d0d7de",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <div>
              <div style={{ fontWeight: 600, color: "#24292f" }}>
                {viewingFrameworkFile.name}
              </div>
              <div style={{ fontSize: 12, color: "#57606a" }}>
                {viewingFrameworkFile.path}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            <button
              onClick={() => setViewingFrameworkFile(null)}
              style={{
                background: "none",
                border: "1px solid #d0d7de",
                borderRadius: 6,
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 14,
                color: "#24292f",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FiX size={16} />
              Close
            </button>
          </div>
        </div>
        <div
          style={{
            backgroundColor: "#0d1117",
            overflow: "auto",
            maxHeight: "calc(85vh - 70px)",
          }}
        >
          {frameworkFileLoading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 60,
                color: "#8b949e",
              }}
            >
              <div style={styles.spinner}></div>
              <span style={{ marginLeft: 12 }}>Loading file content...</span>
            </div>
          ) : (
            <pre
              style={{
                margin: 0,
                padding: 20,
                color: "#c9d1d9",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {viewingFrameworkFile.content || "// File content unavailable"}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default FrameworkFileModal;
