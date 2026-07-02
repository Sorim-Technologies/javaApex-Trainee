import React from "react";
import { CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { styles } from "../../pages/styles";

interface RepositoryArchitectureCardProps {
  hasJavaVersion: boolean;
  hasFramework: boolean;
  hasApi: boolean;
  hasDependencyGraph: boolean;
  hasCircularDependency: boolean | null;
  onViewGraph: () => void;
  loadingGraph?: boolean;
}

export function RepositoryArchitectureCard({
  hasJavaVersion,
  hasFramework,
  hasApi,
  hasDependencyGraph,
  hasCircularDependency,
  onViewGraph,
  loadingGraph = false,
}: RepositoryArchitectureCardProps) {
  return (
    <div style={styles.detectedConfigCard}>
      <div style={styles.detectedConfigHeader}>
        <div>
          <div style={styles.detectedConfigTitle}>Repository Architecture Analysis</div>
          <div style={styles.detectedConfigSubtitle}>
            Discovery of structure, API dependencies, and circular reference safety.
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155" }}>
          <CheckCircle size={16} color={hasJavaVersion ? "#10b981" : "#94a3b8"} />
          <span style={{ fontWeight: 500 }}>Java Version:</span>
          <span style={{ color: hasJavaVersion ? "#059669" : "#64748b", fontWeight: 600 }}>
            {hasJavaVersion ? "Verified" : "Not Found"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155" }}>
          <CheckCircle size={16} color={hasFramework ? "#10b981" : "#94a3b8"} />
          <span style={{ fontWeight: 500 }}>Frameworks:</span>
          <span style={{ color: hasFramework ? "#059669" : "#64748b", fontWeight: 600 }}>
            {hasFramework ? "Analyzed" : "None Detected"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155" }}>
          <CheckCircle size={16} color={hasApi ? "#10b981" : "#94a3b8"} />
          <span style={{ fontWeight: 500 }}>APIs & Endpoints:</span>
          <span style={{ color: hasApi ? "#059669" : "#64748b", fontWeight: 600 }}>
            {hasApi ? "Discovered" : "None Discovered"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155" }}>
          <CheckCircle size={16} color={hasDependencyGraph ? "#10b981" : "#94a3b8"} />
          <span style={{ fontWeight: 500 }}>Dependency Graph:</span>
          <span style={{ color: hasDependencyGraph ? "#059669" : "#64748b", fontWeight: 600 }}>
            {hasDependencyGraph ? "Built" : "Pending"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155" }}>
          {hasCircularDependency === true ? (
            <AlertTriangle size={16} color="#ef4444" />
          ) : (
            <CheckCircle size={16} color={hasCircularDependency === false ? "#10b981" : "#94a3b8"} />
          )}
          <span style={{ fontWeight: 500 }}>Circular Dependency Detection:</span>
          <span style={{ 
            color: hasCircularDependency === true ? "#ef4444" : hasCircularDependency === false ? "#059669" : "#64748b", 
            fontWeight: 600 
          }}>
            {hasCircularDependency === true 
              ? "Circular Dependency Found ❌" 
              : hasCircularDependency === false 
              ? "Safe (No cycles) ✔" 
              : "Pending"}
          </span>
        </div>
      </div>

      <div style={{ padding: "0 20px 20px 20px" }}>
        <button
          type="button"
          onClick={onViewGraph}
          disabled={loadingGraph}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            padding: "10px 16px",
            fontSize: "13px",
            fontWeight: 600,
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#2563eb",
            color: "#fff",
            cursor: loadingGraph ? "not-allowed" : "pointer",
            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!loadingGraph) e.currentTarget.style.backgroundColor = "#1d4ed8";
          }}
          onMouseLeave={(e) => {
            if (!loadingGraph) e.currentTarget.style.backgroundColor = "#2563eb";
          }}
        >
          {loadingGraph ? "Generating Dependency Graph..." : "View Dependency Graph"}
          {!loadingGraph && <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  );
}

export default RepositoryArchitectureCard;
