import React from "react";
import { styles } from "../../pages/styles";

interface ProgressBarProps {
  percent: number;
  animated?: boolean;
}

export function ProgressBar({ percent, animated = false }: ProgressBarProps) {
  if (animated) {
    return (
      <div style={styles.animatedProgressSection}>
        <div style={styles.animatedProgressHeader}>
          <span>Migration Progress</span>
          <span>{percent}%</span>
        </div>
        <div style={styles.animatedProgressBar}>
          <div
            style={{
              ...styles.animatedProgressFill,
              width: `${percent}%`,
              background: `linear-gradient(90deg, #3b82f6 ${percent - 10}%, #22c55e ${percent}%)`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.progressSection}>
      <div style={styles.progressHeader}>
        <span>Overall Progress</span>
        <span>{percent}%</span>
      </div>
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default ProgressBar;
