import React from "react";
import { styles } from "../../pages/styles";

interface MigrationActionsProps {
  setStep: (val: number) => void;
  loading: boolean;
  onStartMigration: (targetRepoName: string) => void;
  targetRepoName: string;
}

export function MigrationActions({
  setStep,
  loading,
  onStartMigration,
  targetRepoName,
}: MigrationActionsProps) {
  return (
    <div style={styles.btnRow}>
      <button style={styles.secondaryBtn} onClick={() => setStep(3)}>
        ← Back
      </button>
      <button
        style={{ ...styles.primaryBtn, opacity: loading ? 0.5 : 1 }}
        onClick={() => onStartMigration(targetRepoName)}
        disabled={loading}
      >
        {loading ? "Starting..." : "🚀 Start Migration"}
      </button>
    </div>
  );
}

export default MigrationActions;
