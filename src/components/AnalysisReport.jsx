import React from "react";
import { Button } from "@mui/material";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";

export default function AnalysisReport({ summary = [], sections = [], onDownload }) {
  const downloads = [
    { label: "Download PDF Report", format: "pdf", icon: FileText },
    { label: "Download Excel Report", format: "xlsx", icon: FileSpreadsheet },
    { label: "Download JSON Report", format: "json", icon: FileJson },
  ];

  return (
    <section className="migration-dashboard-card analysis-report-card">
      <div className="migration-card-heading">
        <div>
          <h3>Migration Analysis Report</h3>
          <p>Exportable summary of migration readiness, changes, and recommendations.</p>
        </div>
      </div>

      <div className="analysis-download-grid">
        {downloads.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.format}
              variant="outlined"
              startIcon={<Icon size={17} />}
              endIcon={<Download size={15} />}
              onClick={() => onDownload?.(item.format)}
            >
              {item.label}
            </Button>
          );
        })}
      </div>

      <div className="analysis-summary-grid">
        {summary.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="analysis-section-list">
        {sections.map((section) => (
          <article key={section.title}>
            <h4>{section.title}</h4>
            <p>{section.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
