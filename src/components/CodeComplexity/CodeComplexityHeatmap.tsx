import React, { useMemo, useState } from "react";
import type { ComplexityFile } from "../../services/migrationService";

interface Props {
  files: ComplexityFile[];
  onSelectFile?: (file: ComplexityFile) => void;
}

export default function CodeComplexityHeatmap({ files, onSelectFile }: Props) {
  const [search, setSearch] = useState("");

  const filteredFiles = useMemo(() => {
    return files.filter((file) =>
      file.file.toLowerCase().includes(search.toLowerCase())
    );
  }, [files, search]);

  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 20,
        marginTop: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h3
            style={{
              color: "#f8fafc",
              margin: 0,
            }}
          >
            Code Complexity Heatmap
          </h3>

          <p
            style={{
              color: "#94a3b8",
              marginTop: 6,
              fontSize: 13,
            }}
          >
            Click a file to view details
          </p>
        </div>

        <input
          placeholder="Search file..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: 250,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #475569",
            background: "#1e293b",
            color: "white",
            outline: "none",
          }}
        />
      </div>

      {/* Heatmap */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
          gap: 14,
        }}
      >
        {filteredFiles.map((file) => (
          <div
            key={file.path}
            title={`${file.file}
Complexity : ${file.complexity}
Level : ${file.level}`}
            style={{
              background: file.color,
              borderRadius: 10,
              padding: 14,
              cursor: "pointer",
              color: "white",
              transition: "0.2s",
              boxShadow: `0 0 10px ${file.color}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            onClick={() => onSelectFile?.(file)}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              {file.file}
            </div>

            <div
              style={{
                fontSize: 12,
                opacity: 0.85,
              }}
            >
              {file.package}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  background: "rgba(255,255,255,.2)",
                  padding: "4px 8px",
                  borderRadius: 20,
                  fontSize: 11,
                }}
              >
                {file.level}
              </span>

              <span
                style={{
                  fontWeight: 700,
                }}
              >
                {file.complexity}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <div
          style={{
            textAlign: "center",
            color: "#94a3b8",
            marginTop: 40,
          }}
        >
          No matching files found.
        </div>
      )}
    </div>
  );
}