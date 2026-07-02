import React from "react";
import { FaJava } from "react-icons/fa";
import { TbPackages as TbPackagesIcon } from "react-icons/tb";
import { getDetectedComponentCategory } from "../../utils/formatters";
import { styles } from "../../pages/styles";
import type { RepoAnalysis } from "../../types/migration";

interface FrameworkCardProps {
  detectedFrameworks: { name: string; path: string; type: string }[];
  onFrameworkClick: (fw: { name: string; path: string; type: string }) => void;
  repoAnalysis: RepoAnalysis | null;
}

export function FrameworkCard({
  detectedFrameworks,
  onFrameworkClick,
  repoAnalysis,
}: FrameworkCardProps) {
  return (
    <>
      <div style={styles.sectionTitle}>
        <TbPackagesIcon size={22} />
        <span>Detected Frameworks & Libraries</span>
      </div>

      {detectedFrameworks.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {detectedFrameworks.map((fw, idx) => (
            <div
              key={idx}
              onClick={() => onFrameworkClick(fw)}
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
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
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
                  <div style={{ fontWeight: 600, color: "#24292f", fontSize: 14 }}>
                    {fw.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#57606a" }}>{fw.type}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: 999,
                        backgroundColor:
                          getDetectedComponentCategory(fw.type) === "Framework"
                            ? "#ede9fe"
                            : "#e0f2fe",
                        color:
                          getDetectedComponentCategory(fw.type) === "Framework"
                            ? "#6d28d9"
                            : "#075985",
                        border:
                          getDetectedComponentCategory(fw.type) === "Framework"
                            ? "1px solid #c4b5fd"
                            : "1px solid #bae6fd",
                      }}
                    >
                      {getDetectedComponentCategory(fw.type)}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    backgroundColor: "#dcfce7",
                    borderRadius: 10,
                    color: "#166534",
                  }}
                >
                  Detected
                </span>
                <span style={{ color: "#0969da", fontSize: 12 }}>📂 View</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.frameworkGrid}>
          <div style={styles.frameworkItem}>
            <span>🍃</span>
            <span>Spring Boot</span>
            {repoAnalysis?.dependencies?.some((d) => d.artifact_id.includes("spring")) && (
              <span style={styles.detectedBadge}>Detected</span>
            )}
          </div>
          <div style={styles.frameworkItem}>
            <span>🗄️</span>
            <span>JPA/Hibernate</span>
            {repoAnalysis?.dependencies?.some(
              (d) => d.artifact_id.includes("hibernate") || d.artifact_id.includes("jpa")
            ) && <span style={styles.detectedBadge}>Detected</span>}
          </div>
          <div style={styles.frameworkItem}>
            <span>🧪</span>
            <span>JUnit</span>
            {repoAnalysis?.dependencies?.some((d) => d.artifact_id.includes("junit")) && (
              <span style={styles.detectedBadge}>Detected</span>
            )}
          </div>
          <div style={styles.frameworkItem}>
            <span>📝</span>
            <span>Log4j/SLF4J</span>
            {repoAnalysis?.dependencies?.some(
              (d) => d.artifact_id.includes("log4j") || d.artifact_id.includes("slf4j")
            ) && <span style={styles.detectedBadge}>Detected</span>}
          </div>
        </div>
      )}
    </>
  );
}

export default FrameworkCard;
