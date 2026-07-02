import React from "react";
import { MdManageSearch } from "react-icons/md";
import { LuTimer as LuTimerIcon } from "react-icons/lu";
import { styles } from "../../pages/styles";

interface DiscoverySummaryProps {
  analysisLoading: boolean;
  formattedAnalysisElapsed: string;
}

export function DiscoverySummary({
  analysisLoading,
  formattedAnalysisElapsed,
}: DiscoverySummaryProps) {
  return (
    <>
      <div style={styles.connectEyebrow}>Step 2</div>
      <div style={styles.stepHeader}>
        <span style={styles.stepIcon}>
          <MdManageSearch size={28} />
        </span>
        <div>
          <h2 style={styles.title}>Repository Discovery & Dependencies</h2>
          <p style={styles.subtitle}>Explore repository structure and analyze project dependencies</p>
        </div>
        {analysisLoading && (
          <div style={styles.timerCard}>
            <div style={styles.timerLeft}>
              <div style={styles.timerDot} />
              <span style={styles.timerTitle}>Analysis Running</span>
            </div>

            <div style={styles.timerRight}>
              <LuTimerIcon size={18} color="#2563eb" />
              <span style={styles.timerValue}>{formattedAnalysisElapsed}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default DiscoverySummary;
