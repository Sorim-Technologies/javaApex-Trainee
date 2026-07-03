import React from "react";
import { FiTerminal } from "react-icons/fi";
import { styles } from "../../pages/styles";

export const LogsHeader: React.FC = () => {
  return (
    <div>
      <div style={styles.stepHeader}>
        <span style={styles.stepIcon}>
          <FiTerminal />
        </span>
        <div>
          <h2 style={styles.title}>Migration Logs</h2>
          <p style={styles.subtitle}>
            View real-time migration logs, execution status, errors, warnings, and completed tasks.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LogsHeader;