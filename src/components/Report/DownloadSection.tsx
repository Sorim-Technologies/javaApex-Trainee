import React from "react";
import { API_BASE_URL } from "../../services/migrationService";
import { styles } from "../../pages/styles";
import { generateReadmeContent, generateProjectReadme } from "./ReportHelpers";
import type { MigrationResult, RepoInfo } from "../../types/migration";

interface DownloadSectionProps {
  migrationJob: MigrationResult;
  migrationLogs: string[];
  selectedRepo: RepoInfo | null;
  isHighRiskProject: boolean;
  detectedFrameworks: { name: string; path: string; type: string }[];
}

export function DownloadSection({
  migrationJob,
  migrationLogs,
  selectedRepo,
  isHighRiskProject,
  detectedFrameworks,
}: DownloadSectionProps) {
  const downloadZip = () => {
    const zipUrl = `${API_BASE_URL}/migration/${migrationJob.job_id}/download-zip`;
    const link = document.createElement("a");
    link.href = zipUrl;
    link.download = `migrated-project-${migrationJob.job_id}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadFullReport = () => {
    const reportUrl = `${API_BASE_URL}/migration/${migrationJob.job_id}/report`;
    window.open(reportUrl, "_blank");
  };

  const downloadReportMarkdown = () => {
    const readmeContent = generateReadmeContent(migrationJob, migrationLogs);
    const blob = new Blob([readmeContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "MIGRATION_REPORT.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadReadmeMarkdown = () => {
    const projectReadme = generateProjectReadme(
      migrationJob,
      selectedRepo,
      isHighRiskProject,
      detectedFrameworks
    );
    const blob = new Blob([projectReadme], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "README.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.btnRow}>
      <button style={{ ...styles.secondaryBtn, marginRight: 10 }} onClick={downloadZip}>
        📦 Download Migrated Project (ZIP)
      </button>
      <button style={{ ...styles.secondaryBtn, marginRight: 10 }} onClick={downloadFullReport}>
        📥 Download Full Report
      </button>
      <button style={{ ...styles.secondaryBtn, marginRight: 10 }} onClick={downloadReportMarkdown}>
        📄 Download Migration Report
      </button>
      <button style={{ ...styles.secondaryBtn, marginRight: 10 }} onClick={downloadReadmeMarkdown}>
        📘 Download Project README
      </button>
    </div>
  );
}

export default DownloadSection;
