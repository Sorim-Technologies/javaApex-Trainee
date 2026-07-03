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
  const levelColors: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
};
const badgeStyles = {
  Critical: {
    background: "#FEE2E2",
    color: "#DC2626",
  },
  High: {
    background: "#FFEDD5",
    color: "#EA580C",
  },
  Medium: {
    background: "#FEF3C7",
    color: "#D97706",
  },
  Low: {
    background: "#DCFCE7",
    color: "#16A34A",
  },
};

  return (
    <div
      style={{
        background:"#ffffff",
        border: "1px solid rgb(177, 175, 175)",
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
              color: "#161616",
              margin: 0,
            }}
          >
            Code Complexity Heatmap
          </h3>

       
        </div>

        <input
          placeholder="Search file..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: 250,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #416597",
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
  onClick={() => onSelectFile?.(file)}
 style={{
  background: "#ffffff",
  borderRadius: 12,
  padding: 16,
  cursor: "pointer",
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  transition: "all 0.2s ease",
}}

           onMouseEnter={(e) => {
  e.currentTarget.style.transform = "translateY(-4px)";
  e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.15)";
}}

onMouseLeave={(e) => {
  e.currentTarget.style.transform = "translateY(0)";
  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
}}
            onClick={() => onSelectFile?.(file)}
          >
            <div
  style={{
    fontWeight: 700,
    fontSize: 10,
    color: "#1f2937",
    marginBottom: 10,
  }}
>
  {file.file}
</div>
<div
  style={{
    fontSize: 13,
    color: "#6b7280",
  }}
>
  {file.package}
</div>

            <div
  style={{
    marginTop: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }}
>
          <span
  style={{
    ...badgeStyles[file.level],
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  }}
>
  {file.level}
</span>

             <span
  style={{
    fontSize: 28,
    fontWeight: 700,
    color: badgeStyles[file.level].color,
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