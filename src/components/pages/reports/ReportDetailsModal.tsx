import type { MigrationReportRecord, ReportDownloadType } from "./reportHistory";

type ReportDetailsModalProps = {
  report: MigrationReportRecord;
  onClose: () => void;
  onDownload: (report: MigrationReportRecord, type: ReportDownloadType) => void;
};

export default function ReportDetailsModal({ report, onClose, onDownload }: ReportDetailsModalProps) {
  const javaUpgrade = `Java ${report.sourceJava} to Java ${report.targetJava}`;
  const rawJob = report.rawJob;

  return (
    <div className="reports-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="reports-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reports-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="reports-modal__header">
          <div>
            <span>Report Details</span>
            <h2 id="reports-modal-title">{report.migrationName}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close report details">Close</button>
        </div>

        <div className="reports-modal__grid">
          <article className="reports-detail-panel reports-detail-panel--wide">
            <h3>Migration Summary</h3>
            <dl>
              <div><dt>Repository</dt><dd>{report.repositoryName}</dd></div>
              <div><dt>Status</dt><dd>{report.status}</dd></div>
              <div><dt>Strategy</dt><dd>{report.strategy}</dd></div>
              <div><dt>Generated</dt><dd>{new Date(report.generatedDate).toLocaleString()}</dd></div>
            </dl>
          </article>

          <article className="reports-detail-panel">
            <h3>Java Upgrade</h3>
            <strong>{javaUpgrade}</strong>
            <p>Source and target runtime versions captured from the completed migration.</p>
          </article>

          <article className="reports-detail-panel">
            <h3>Dependencies Updated</h3>
            <strong>{report.dependenciesUpdated}</strong>
            <p>{rawJob?.dependencies?.length || 0} dependencies were included in the migration report.</p>
          </article>

          <article className="reports-detail-panel">
            <h3>Files Modified</h3>
            <strong>{report.filesModified}</strong>
            <p>Code and configuration files changed during migration execution.</p>
          </article>

          <article className="reports-detail-panel">
            <h3>Execution Time</h3>
            <strong>{report.executionTime}</strong>
            <p>Elapsed time from migration start to generated report completion.</p>
          </article>

          <article className="reports-detail-panel reports-detail-panel--wide">
            <h3>Warnings</h3>
            <ul>
              {report.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </article>

          <article className="reports-detail-panel reports-detail-panel--wide">
            <h3>Recommendations</h3>
            <ul>
              {report.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}
            </ul>
          </article>

          <article className="reports-detail-panel reports-detail-panel--wide">
            <h3>Generated Files</h3>
            <div className="reports-generated-files">
              {report.generatedFiles.map((file) => (
                <button key={file.type} type="button" onClick={() => onDownload(report, file.type)}>
                  <span>{file.label}</span>
                  <small>{file.fileName} - {file.size}</small>
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
