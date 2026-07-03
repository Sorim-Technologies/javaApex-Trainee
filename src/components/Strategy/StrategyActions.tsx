import React from "react";
import { styles } from "../../pages/styles";

interface StrategyActionsProps {
  setStep: (val: number) => void;
}

export function StrategyActions({ setStep }: StrategyActionsProps) {
  return (
    <div style={styles.btnRow}>
      <button style={styles.secondaryBtn} onClick={() => setStep(2)}>
        ← Back
      </button>
      <button style={styles.primaryBtn} onClick={() => setStep(4)}>
        Continue to Migration →
      </button>
    </div>
  );
}

export default StrategyActions;
