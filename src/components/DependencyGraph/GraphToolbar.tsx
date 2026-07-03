import React from "react";
import { Search, X, Maximize2, Minimize2, Filter } from "lucide-react";

export interface GraphToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedTypes: string[];
  onTypeToggle: (type: string) => void;
  onClearFilters: () => void;
  isFullScreen: boolean;
  onFullScreenToggle: () => void;
  availableTypes: string[];
}

const TYPE_LABELS: Record<string, string> = {
  controller: "Controller",
  service: "Service",
  repository: "Repository",
  entity: "Entity",
  configuration: "Config",
  utility: "Utility",
  interface: "Interface",
  other: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  controller: "#2563eb",
  service: "#059669",
  repository: "#7c3aed",
  entity: "#d97706",
  configuration: "#db2777",
  utility: "#0d9488",
  interface: "#4b5563",
  other: "#64748b",
};

export function GraphToolbar({
  searchTerm,
  onSearchChange,
  selectedTypes,
  onTypeToggle,
  onClearFilters,
  isFullScreen,
  onFullScreenToggle,
  availableTypes,
}: GraphToolbarProps) {
  return (
    <div style={{
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(6px)",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      padding: "10px 16px",
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
      width: "100%",
      pointerEvents: "auto",
    }}>
      {/* Search Section */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 240px", position: "relative" }}>
        <Search size={16} style={{ color: "#94a3b8", position: "absolute", left: "10px" }} />
        <input
          type="text"
          placeholder="Search class by name..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px 8px 32px",
            fontSize: "13px",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            outline: "none",
            backgroundColor: "#f8fafc",
            color: "#1e293b",
            transition: "all 0.2s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#2563eb";
            e.target.style.backgroundColor = "#fff";
            e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.15)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#cbd5e1";
            e.target.style.backgroundColor = "#f8fafc";
            e.target.style.boxShadow = "none";
          }}
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            style={{
              position: "absolute",
              right: "10px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              padding: 0,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter Section */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
          <Filter size={14} />
          <span>Filters:</span>
        </div>
        
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {availableTypes.map((type) => {
            const isSelected = selectedTypes.includes(type);
            const color = TYPE_COLORS[type.toLowerCase()] || "#64748b";
            return (
              <button
                key={type}
                onClick={() => onTypeToggle(type)}
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "9999px",
                  cursor: "pointer",
                  border: `1px solid ${isSelected ? color : "#cbd5e1"}`,
                  backgroundColor: isSelected ? `${color}15` : "#fff",
                  color: isSelected ? color : "#64748b",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span style={{ 
                  display: "inline-block", 
                  width: "6px", 
                  height: "6px", 
                  borderRadius: "50%", 
                  backgroundColor: color 
                }} />
                {TYPE_LABELS[type.toLowerCase()] || type}
              </button>
            );
          })}
        </div>

        {(searchTerm || selectedTypes.length > 0) && (
          <button
            onClick={onClearFilters}
            style={{
              background: "none",
              border: "none",
              color: "#ef4444",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              borderRadius: "4px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fee2e2"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Action Section */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={onFullScreenToggle}
          title={isFullScreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "34px",
            height: "34px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            backgroundColor: "#fff",
            color: "#475569",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#fff"}
        >
          {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  );
}
