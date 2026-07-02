import React from "react";
import { styles } from "../../pages/styles";

interface DiscoveryActionsProps {
  setStep: (val: number) => void;
  isJavaProject: boolean | null;
  isHighRiskProject: boolean;
  highRiskConfirmed: boolean;
  analysisLoading: boolean;
  hasRepoAnalysis: boolean;
}

export function DiscoveryActions({
  setStep,
  isJavaProject,
  isHighRiskProject,
  highRiskConfirmed,
  analysisLoading,
  hasRepoAnalysis,
}: DiscoveryActionsProps) {
  const isContinueDisabled =
    isJavaProject === false ||
    (isHighRiskProject && !highRiskConfirmed) ||
    analysisLoading ||
    !hasRepoAnalysis;

  return (
    <div style={styles.btnRow}>
      <button style={styles.secondaryBtn} onClick={() => setStep(1)}>
        ← Back
      </button>
      <button
        style={{
          ...styles.primaryBtn,
          opacity: isContinueDisabled ? 0.5 : 1,
        }}
        onClick={() => setStep(3)}
        disabled={isContinueDisabled}
      >
        Continue to Strategy →
      </button>
    </div>
  );
}

export default DiscoveryActions;
