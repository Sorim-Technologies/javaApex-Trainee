import React from "react";
import { FiArrowLeft, FiDownload, FiArrowRight } from "react-icons/fi";
import { styles } from "../../pages/styles";

interface LogsActionsProps {
  onBack: () => void;
  onDownloadLogs: () => void;
  onDownloadReport: () => void;
  onGoToReport: () => void;
  isDownloadReportDisabled?: boolean;
  isGoToReportDisabled?: boolean;
}

export const LogsActions: React.FC<LogsActionsProps> = ({
  onBack,
  onDownloadLogs,
  onDownloadReport,
  onGoToReport,
  isDownloadReportDisabled = false,
  isGoToReportDisabled = false,
}) => {
  return (
    <div style={styles.btnRow}>
      <button style={styles.secondaryBtn} onClick={onBack}>
        <FiArrowLeft style={{ marginRight: 8 }} />
        Back
      </button>

      <button style={styles.secondaryBtn} onClick={onDownloadLogs}>
        <FiDownload style={{ marginRight: 8 }} />
        Download Logs
      </button>

      
      
    </div>
  );
};

export default LogsActions;
