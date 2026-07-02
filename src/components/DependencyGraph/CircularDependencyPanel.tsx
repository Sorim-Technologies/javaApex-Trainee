import React from "react";
import { AlertCircle, ChevronRight, Eye } from "lucide-react";

export interface CircularDependencyPanelProps {
  cycles: string[][];
  selectedCycleIndex: number | null;
  onSelectCycle: (index: number | null) => void;
}

export function CircularDependencyPanel({
  cycles,
  selectedCycleIndex,
  onSelectCycle,
}: CircularDependencyPanelProps) {
  if (!cycles || cycles.length === 0) {
    return (
      <div style={{
        padding: "20px",
        backgroundColor: "#f0fdf4",
        border: "1px dashed #bbf7d0",
        borderRadius: "8px",
        color: "#166534",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "13px",
        fontWeight: 500,
        marginTop: "16px",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: "#dcfce7",
          color: "#15803d"
        }}>
          ✓
        </div>
        <div>
          <strong>No Circular Dependencies Detected!</strong> Clean architecture rules satisfied.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #fee2e2",
      borderRadius: "8px",
      padding: "16px",
      marginTop: "16px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "#ef4444",
        fontWeight: 700,
        fontSize: "14px",
        borderBottom: "1px solid #fee2e2",
        paddingBottom: "10px",
        marginBottom: "12px",
      }}>
        <AlertCircle size={18} fill="#ef4444" color="#fff" />
        <span>Circular Dependencies ({cycles.length})</span>
      </div>

      <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 16px 0", lineHeight: 1.4 }}>
        The components below depend on each other directly or indirectly, forming a cycle. Click on a circular path to isolate and highlight it in red on the graph.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        {cycles.map((cycle, index) => {
          const isSelected = selectedCycleIndex === index;
          return (
            <div
              key={index}
              onClick={() => onSelectCycle(isSelected ? null : index)}
              style={{
                flex: "1 1 280px",
                border: `1px solid ${isSelected ? "#ef4444" : "#f3f4f6"}`,
                borderRadius: "6px",
                padding: "12px 16px",
                backgroundColor: isSelected ? "#fef2f2" : "#fafafa",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: isSelected ? "0 4px 6px -1px rgba(239, 68, 68, 0.08)" : "none",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "#fca5a5";
                  e.currentTarget.style.backgroundColor = "#fff5f5";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "#f3f4f6";
                  e.currentTarget.style.backgroundColor = "#fafafa";
                }
              }}
            >
              {/* Highlight badge indicator */}
              {isSelected && (
                <div style={{
                  position: "absolute",
                  top: "10px",
                  right: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#ef4444",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}>
                  <Eye size={12} />
                  <span>Viewing</span>
                </div>
              )}

              <div style={{ fontWeight: 600, fontSize: "11px", color: "#475569", marginBottom: "8px" }}>
                CYCLE #{index + 1}
              </div>

              {/* Formatted vertical chain listing */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: "8px" }}>
                {cycle.map((nodeId, nodeIdx) => {
                  const isLast = nodeIdx === cycle.length - 1;
                  return (
                    <React.Fragment key={nodeIdx}>
                      <div style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: isSelected ? "#b91c1c" : "#1e293b",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}>
                        <span style={{ 
                          width: "6px", 
                          height: "6px", 
                          borderRadius: "50%", 
                          backgroundColor: isSelected ? "#ef4444" : "#94a3b8" 
                        }} />
                        {nodeId}
                      </div>
                      
                      {!isLast && (
                        <div style={{
                          fontSize: "12px",
                          color: isSelected ? "#ef4444" : "#94a3b8",
                          margin: "-2px 0 -2px 14px",
                          fontWeight: "bold",
                        }}>
                          ↓
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
