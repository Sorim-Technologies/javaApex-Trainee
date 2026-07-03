import React from "react";
import { styles } from "../../pages/styles";

interface MigrationOptionsProps {
  migrationApproach: string;
  targetRepoName: string;
  setTargetRepoName: (val: string) => void;
}

export function MigrationOptions({
  migrationApproach,
  targetRepoName,
  setTargetRepoName,
}: MigrationOptionsProps) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {migrationApproach === "branch" ? "Target Branch Name" : "Target Repository Name"}
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          style={{ ...styles.input, flex: 1, backgroundColor: "#f0fdf4", borderColor: "#22c55e" }}
          value={targetRepoName}
          onChange={(e) => setTargetRepoName(e.target.value)}
        />
      </div>
      <p style={styles.helpText}>
        Format:{" "}
        <code style={{ backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
          {migrationApproach === "branch" ? (
            <>migration/{"{source-repo}"}-Migrated{"{timestamp}"}</>
          ) : (
            <>https://github.com/SrikkanthSorim/{"{source-repo}"}-Migrated{"{timestamp}"}</>
          )}
        </code>{" "}
        (auto-generated, editable)
      </p>
    </div>
  );
}

export default MigrationOptions;
