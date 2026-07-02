import React from "react";
import { 
  Database, 
  Cpu, 
  Layers, 
  Box, 
  Settings, 
  Wrench, 
  Code, 
  HelpCircle,
  AlertTriangle 
} from "lucide-react";

const LEGEND_ITEMS = [
  { label: "Controller", color: "#2563eb", bg: "#eff6ff", icon: Layers },
  { label: "Service", color: "#059669", bg: "#ecfdf5", icon: Cpu },
  { label: "Repository", color: "#7c3aed", bg: "#f5f3ff", icon: Database },
  { label: "Entity", color: "#d97706", bg: "#fffbeb", icon: Box },
  { label: "Configuration", color: "#db2777", bg: "#fdf2f8", icon: Settings },
  { label: "Utility", color: "#0d9488", bg: "#f0fdfa", icon: Wrench },
  { label: "Interface", color: "#4b5563", bg: "#f9fafb", icon: Code },
  { label: "Other", color: "#64748b", bg: "#f8fafc", icon: HelpCircle },
];

export function GraphLegend() {
  return (
    <div style={{
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(4px)",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      padding: "12px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      fontSize: "11px",
      color: "#334155",
      width: "fit-content",
      pointerEvents: "auto",
    }}>
      <div style={{ fontWeight: 700, fontSize: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "4px", color: "#1e293b" }}>
        Node Legend
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
        {LEGEND_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "20px",
                height: "20px",
                borderRadius: "4px",
                backgroundColor: item.bg,
                border: `1px solid ${item.color}50`,
                color: item.color,
              }}>
                <Icon size={12} />
              </div>
              <span style={{ fontWeight: 500 }}>{item.label}</span>
            </div>
          );
        })}
      </div>
      
      <div style={{ 
        marginTop: "8px", 
        borderTop: "1px solid #e2e8f0", 
        paddingTop: "6px", 
        display: "flex", 
        alignItems: "center", 
        gap: "6px", 
        color: "#ef4444",
        fontWeight: 600,
        fontSize: "10px"
      }}>
        <AlertTriangle size={12} fill="#ef4444" color="#fff" />
        <span>Circular Dependency Node</span>
      </div>
    </div>
  );
}
