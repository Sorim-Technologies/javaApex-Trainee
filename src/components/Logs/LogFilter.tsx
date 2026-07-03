import React from "react";
import { styles } from "../../pages/styles";

interface LogFilterProps {
  filter: "ALL" | "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  onChange: (value: "ALL" | "INFO" | "SUCCESS" | "WARNING" | "ERROR") => void;
}

export const LogFilter: React.FC<LogFilterProps> = ({ filter, onChange }) => {
  return (
    <select
      style={{ ...styles.select, width: "auto", minWidth: 150, padding: "10px 14px", height: 42 }}
      value={filter}
      onChange={(e) =>
        onChange(e.target.value as "ALL" | "INFO" | "SUCCESS" | "WARNING" | "ERROR")
      }
    >
      <option value="ALL">All Logs</option>
      <option value="INFO">Info</option>
      <option value="SUCCESS">Success</option>
      <option value="WARNING">Warning</option>
      <option value="ERROR">Error</option>
    </select>
  );
};

export default LogFilter;
