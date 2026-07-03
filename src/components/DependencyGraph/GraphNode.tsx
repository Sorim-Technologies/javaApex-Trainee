import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
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

export interface GraphNodeProps {
  data: {
    label: string;
    type: string;
    package?: string;
    isHighlighted?: boolean;
    isInCycle?: boolean;
    isCycleSelected?: boolean;
  };
}

const TYPE_CONFIGS: Record<string, {
  color: string;
  bg: string;
  border: string;
  icon: React.ComponentType<any>;
  label: string;
}> = {
  controller: {
    color: "#2563eb", // blue
    bg: "#eff6ff",
    border: "#bfdbfe",
    icon: Layers,
    label: "Controller",
  },
  service: {
    color: "#059669", // emerald
    bg: "#ecfdf5",
    border: "#a7f3d0",
    icon: Cpu,
    label: "Service",
  },
  repository: {
    color: "#7c3aed", // purple
    bg: "#f5f3ff",
    border: "#ddd6fe",
    icon: Database,
    label: "Repository",
  },
  entity: {
    color: "#d97706", // amber
    bg: "#fffbeb",
    border: "#fde68a",
    icon: Box,
    label: "Entity",
  },
  configuration: {
    color: "#db2777", // pink
    bg: "#fdf2f8",
    border: "#fbcfe8",
    icon: Settings,
    label: "Configuration",
  },
  utility: {
    color: "#0d9488", // teal
    bg: "#f0fdfa",
    border: "#99f6e4",
    icon: Wrench,
    label: "Utility",
  },
  interface: {
    color: "#4b5563", // gray
    bg: "#f9fafb",
    border: "#e5e7eb",
    icon: Code,
    label: "Interface",
  },
  other: {
    color: "#64748b", // slate
    bg: "#f8fafc",
    border: "#e2e8f0",
    icon: HelpCircle,
    label: "Other",
  },
};

export const GraphNode = memo(({ data }: GraphNodeProps) => {
  const typeConfig = TYPE_CONFIGS[data.type.toLowerCase()] || TYPE_CONFIGS.other;
  const Icon = typeConfig.icon;

  // Visual state classes
  const isHighlighted = data.isHighlighted;
  const isInCycle = data.isInCycle;
  const isCycleSelected = data.isCycleSelected;

  let borderColor = typeConfig.border;
  let boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
  let scale = "1";
  let opacity = "1";

  if (isHighlighted) {
    borderColor = typeConfig.color;
    boxShadow = `0 0 12px 3px ${typeConfig.color}44`;
    scale = "1.05";
  } else if (isCycleSelected) {
    borderColor = "#ef4444"; // red
    boxShadow = "0 0 14px 4px rgba(239, 68, 68, 0.5)";
    scale = "1.08";
  } else if (isInCycle) {
    borderColor = "#f87171"; // soft red
    boxShadow = "0 0 8px 1px rgba(248, 113, 113, 0.3)";
  }

  const containerStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: "8px",
    backgroundColor: typeConfig.bg,
    border: `2px solid ${borderColor}`,
    boxShadow: boxShadow,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: "160px",
    maxWidth: "240px",
    transform: `scale(${scale})`,
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    cursor: "pointer",
  };

  return (
    <div style={containerStyle}>
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: isCycleSelected ? "#ef4444" : "#94a3b8", width: "8px", height: "8px" }} 
      />
      
      {/* Node Header */}
      <div style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: "8px" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          width: "24px", 
          height: "24px", 
          borderRadius: "6px", 
          backgroundColor: `${typeConfig.color}15`,
          color: typeConfig.color 
        }}>
          <Icon size={14} />
        </div>
        
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ 
            fontWeight: 600, 
            fontSize: "12px", 
            color: "#1e293b", 
            textOverflow: "ellipsis", 
            overflow: "hidden", 
            whiteSpace: "nowrap" 
          }}>
            {data.label}
          </div>
          <div style={{ 
            fontSize: "9px", 
            color: "#64748b", 
            textOverflow: "ellipsis", 
            overflow: "hidden", 
            whiteSpace: "nowrap" 
          }}>
            {data.package || "default"}
          </div>
        </div>

        {isInCycle && (
          <div 
            title="Part of a circular dependency" 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "#ef4444" 
            }}
          >
            <AlertTriangle size={14} fill="#ef4444" color="#fff" />
          </div>
        )}
      </div>

      {/* Node Badge */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
        <span style={{ 
          fontSize: "8px", 
          fontWeight: 700, 
          padding: "2px 6px", 
          borderRadius: "9999px", 
          backgroundColor: `${typeConfig.color}20`,
          color: typeConfig.color,
          textTransform: "uppercase"
        }}>
          {typeConfig.label}
        </span>
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: isCycleSelected ? "#ef4444" : "#94a3b8", width: "8px", height: "8px" }} 
      />
    </div>
  );
});

GraphNode.displayName = "GraphNode";
