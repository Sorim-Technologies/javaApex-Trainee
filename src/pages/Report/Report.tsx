import React from "react";
import { styles } from "../styles";
import {
  SummaryCard,
  BuildResultCard,
  DownloadSection,
  ExecutionLogs,
  GeneratedFiles,
  ReportActions,
} from "../../components/Report";
import type { ReportProps } from "../../components/Report/ReportTypes";

export default function Report({
  migrationJob,
  migrationLogs,
  runSonar,
  runFossa,
  fossaResult,
  fossaLoading,
  codeChanges,
  selectedDiffFile,
  setSelectedDiffFile,
  showCodeChanges,
  setShowCodeChanges,
  selectedRepo,
  isHighRiskProject,
  detectedFrameworks,
  resetWizard,
  setStep,
}: ReportProps) {
  return (
    <div style={styles.card}>
      <div style={styles.stepHeader}>
        <span style={styles.stepIcon}>📄</span>
        <div>
          <h2 style={styles.title}>Migration Report</h2>
          <p style={styles.subtitle}>Complete migration summary with all results and metrics.</p>
        </div>
      </div>
      <div style={styles.reportContainer}>
        {migrationJob.status === "failed" && (
          <div style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            color: "#991b1b"
          }}>
            <span style={{ fontSize: "20px" }}>❌</span>
            <div>
              <h3 style={{ margin: 0, fontWeight: 600, fontSize: "16px" }}>Migration Failed</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", opacity: 0.9 }}>
                {migrationJob.error_message || "An unexpected error occurred during the migration process."}
              </p>
            </div>
          </div>
        )}

        {migrationJob.status === "completed" && (
          <div style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            color: "#166534"
          }}>
            <span style={{ fontSize: "20px" }}>✅</span>
            <div>
              <h3 style={{ margin: 0, fontWeight: 600, fontSize: "16px" }}>Migration Completed Successfully</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", opacity: 0.9 }}>
                All migration steps completed successfully! You can now view the results and download the upgraded repository.
              </p>
            </div>
          </div>
        )}

        <SummaryCard migrationJob={migrationJob} />

        <BuildResultCard
          migrationJob={migrationJob}
          runSonar={runSonar}
          runFossa={runFossa}
          fossaResult={fossaResult}
          fossaLoading={fossaLoading}
        />

        <DownloadSection
          migrationJob={migrationJob}
          migrationLogs={migrationLogs}
          selectedRepo={selectedRepo}
          isHighRiskProject={isHighRiskProject}
          detectedFrameworks={detectedFrameworks}
        />

        <GeneratedFiles
          codeChanges={codeChanges}
          selectedDiffFile={selectedDiffFile}
          setSelectedDiffFile={setSelectedDiffFile}
          showCodeChanges={showCodeChanges}
          setShowCodeChanges={setShowCodeChanges}
        />

        <ExecutionLogs
          migrationLogs={migrationLogs}
          migrationJob={migrationJob}
        />

        <ReportActions
          setStep={setStep}
          resetWizard={resetWizard}
        />
      </div>
    </div>
  );
}
