import React from "react";
import { getRepositoryLink } from "../../utils/formatters";
import { styles } from "../../pages/styles";
import StageIndicator from "./StageIndicator";
import ProgressBar from "./ProgressBar";
import WorkerStatus from "./WorkerStatus";
import type { MigrationResult } from "../../types/migration";

interface MigrationStatusCardProps {
  step: number;
  setStep: (val: number) => void;
  migrationJob: MigrationResult | null;
  selectedSourceVersion: string;
  selectedTargetVersion: string;
  animationProgress: number;
  migrationLogs: string[];
  resetWizard: () => void;
}

export function MigrationStatusCard({
  step,
  setStep,
  migrationJob,
  selectedSourceVersion,
  selectedTargetVersion,
  animationProgress,
  migrationLogs,
  resetWizard,
}: MigrationStatusCardProps) {
  if (step === 5) {
    return (
      <div style={styles.card}>
        <div style={styles.connectEyebrow}>Step 5</div>
        <div style={styles.stepHeader}>
          <span style={styles.stepIcon}>🚀</span>
          <div>
            <h2 style={styles.title}>Migration in Progress</h2>
            <p style={styles.subtitle}>Your project is being migrated... Please wait.</p>
          </div>
        </div>

        <div style={styles.animationContainer}>
          <div style={styles.migrationAnimation}>
            <div style={styles.animationHeader}>
              <div style={styles.migratingText}>Migrating Java Project</div>
              <div style={styles.versionTransition}>
                Java {selectedSourceVersion} → Java {selectedTargetVersion || "Select Java Version"}
              </div>
            </div>

            <StageIndicator progress={animationProgress} />

            <ProgressBar percent={animationProgress} animated />

            <div style={styles.statusMessages}>
              <div style={styles.currentStatus}>
                <strong>Status:</strong>{" "}
                {migrationJob?.current_step && /fossa/i.test(migrationJob.current_step)
                  ? "FOSSA_ANALYSIS"
                  : migrationJob?.status?.toUpperCase() || "INITIALIZING"}
              </div>
              <div style={styles.currentStatus}>
                {migrationJob?.current_step || "Initializing migration..."}
              </div>
              {migrationLogs.length > 0 && (
                <div 
                  style={{ ...styles.recentLog, cursor: "pointer" }}
                  onClick={() => setStep(6)}
                  title="Click to view detailed logs"
                >
                  <strong>Latest:</strong> {migrationLogs[migrationLogs.length - 1]}
                </div>
              )}
              {migrationJob?.status === "cloning" && (
                <div style={{ ...styles.recentLog, color: "#f59e0b", fontSize: 12 }}>
                  ℹ️ Cloning repository... this may take a few minutes for large repositories. Please wait.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 6) {
    if (!migrationJob) return null;

    const isCancelable =
      migrationJob.status === "cloning" ||
      migrationJob.status === "analyzing" ||
      migrationJob.status === "migrating";

    const isFailed = migrationJob.status === "failed";
    const isCompleted = migrationJob.status === "completed";

    return (
      <div style={styles.card}>
        <div style={styles.stepHeader}>
          <span style={styles.stepIcon}>
            {isCompleted ? "✅" : isFailed ? "❌" : "⏳"}
          </span>
          <div>
            <h2 style={styles.title}>
              {isCompleted
                ? "Migration Completed!"
                : isFailed
                ? "Migration Failed"
                : "Migration in Progress"}
            </h2>
            <p style={styles.subtitle}>{migrationJob?.current_step || "Processing..."}</p>
          </div>
        </div>

        {isFailed && (
          <div
            style={{
              ...styles.errorBox,
              padding: 20,
              marginBottom: 20,
              borderRadius: 8,
              backgroundColor: "#fee2e2",
              borderLeft: "4px solid #dc2626",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: "#7f1d1d", marginBottom: 10 }}>
              ❌ Migration Failed
            </div>
            {migrationJob?.error_message && (
              <div
                style={{
                  color: "#991b1b",
                  marginBottom: 10,
                  fontFamily: "monospace",
                  fontSize: 14,
                  padding: 10,
                  backgroundColor: "#fecaca",
                  borderRadius: 4,
                }}
              >
                {migrationJob.error_message}
              </div>
            )}
            {migrationJob?.migration_log && migrationJob.migration_log.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#7f1d1d", marginBottom: 8 }}>
                  Recent Logs:
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#7f1d1d",
                    fontFamily: "monospace",
                    maxHeight: 150,
                    overflow: "auto",
                  }}
                >
                  {migrationJob.migration_log.slice(-5).map((log, idx) => (
                    <div key={idx} style={{ marginBottom: 4 }}>
                      • {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <ProgressBar percent={migrationJob.progress_percent ?? 0} />

        <WorkerStatus migrationJob={migrationJob} />

        {isCompleted && migrationJob.target_repo && (
          <div style={styles.successBox}>
            <div style={styles.successTitle}>🎉 Migration Successful!</div>
            <a
              href={getRepositoryLink(migrationJob.target_repo) || "#"}
              target="_blank"
              rel="noreferrer"
              style={styles.repoLink}
            >
              View Migrated Repository →
            </a>
          </div>
        )}

        <div style={styles.btnRow}>
          {isCancelable && (
            <button
              style={{ ...styles.secondaryBtn, marginRight: 10, backgroundColor: "#ef4444", color: "white" }}
              onClick={resetWizard}
            >
              ⏹️ Cancel Migration
            </button>
          )}
          {isFailed && (
            <button
              style={{ ...styles.primaryBtn, marginRight: 10 }}
              onClick={resetWizard}
            >
              🔄 Try Again
            </button>
          )}
          {!isCancelable && !isFailed && (
            <button style={styles.primaryBtn} onClick={() => setStep(7)}>
              View Migration Report →
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default MigrationStatusCard;
