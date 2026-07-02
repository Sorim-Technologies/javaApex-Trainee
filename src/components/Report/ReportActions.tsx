import React from "react";
import { styles } from "../../pages/styles";

interface ReportActionsProps {
  setStep: (val: number) => void;
  resetWizard: () => void;
}

export function ReportActions({ setStep, resetWizard }: ReportActionsProps) {
  return (
    <div style={styles.btnRow}>
      <button style={styles.secondaryBtn} onClick={() => setStep(4)}>
        ← Back to Migration
      </button>
      <button style={styles.secondaryBtn} onClick={() => setStep(6)}>
        📋 View Logs
      </button>
      <button style={styles.primaryBtn} onClick={resetWizard}>
        Start New Migration
      </button>
    </div>
  );
}

export default ReportActions;
