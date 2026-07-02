import React from "react";
import { FiDownload, FiTrash2, FiSearch } from "react-icons/fi";
import { styles } from "../../pages/styles";
import LogFilter from "./LogFilter";

interface LogsToolbarProps {
  search: string;
  filter: "ALL" | "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  autoScroll: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: "ALL" | "INFO" | "SUCCESS" | "WARNING" | "ERROR") => void;
  onToggleAutoScroll: () => void;
  onDownload: () => void;
  onClear: () => void;
}

export const LogsToolbar: React.FC<LogsToolbarProps> = ({
  search,
  filter,
  autoScroll,
  onSearchChange,
  onFilterChange,
  onToggleAutoScroll,
  onDownload,
  onClear,
}) => {
  return (
    <div style={toolbarStyles.container}>
      <div style={toolbarStyles.leftActions}>
        <div style={toolbarStyles.searchWrapper}>
          <FiSearch style={toolbarStyles.searchIcon} />
          <input
            style={{ ...styles.input, border: "none", padding: "0 10px 0 0", boxShadow: "none", background: "transparent", outline: "none", width: "100%", height: "100%" }}
            placeholder="Search logs..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <LogFilter filter={filter} onChange={onFilterChange} />

        <label style={toolbarStyles.toggleLabel}>
          <input
            type="checkbox"
            style={styles.checkbox}
            checked={autoScroll}
            onChange={onToggleAutoScroll}
          />
          Auto Scroll
        </label>
      </div>

      <div style={toolbarStyles.rightActions}>
        <button style={{ ...styles.secondaryBtn, height: 42, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={onClear}>
          <FiTrash2 />
          Clear
        </button>
        <button style={{ ...styles.primaryBtn, height: 42, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={onDownload}>
          <FiDownload />
          Download
        </button>
      </div>
    </div>
  );
};

const toolbarStyles = {
  container: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
    flexWrap: "wrap" as const,
  },
  leftActions: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap" as const,
    flex: 1,
  },
  rightActions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "0 14px",
    background: "var(--card)",
    height: 42,
    flex: 1,
    minWidth: 200,
    maxWidth: 320,
  },
  searchIcon: {
    color: "var(--muted-foreground)",
    fontSize: 16,
  },
  toggleLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--foreground)",
    cursor: "pointer",
  },
};

export default LogsToolbar;