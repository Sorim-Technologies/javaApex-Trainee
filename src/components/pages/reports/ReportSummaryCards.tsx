import type { MigrationReportRecord } from "./reportHistory";

type ReportSummaryCardsProps = {
  reports: MigrationReportRecord[];
  storageUsed: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
};

export default function ReportSummaryCards({ reports, storageUsed }: ReportSummaryCardsProps) {
  const successfulMigrations = reports.filter((report) => report.status === "completed").length;
  const latestReport = reports[0] ? formatDate(reports[0].generatedDate) : "N/A";

  const cards = [
    { label: "Total Reports", value: String(reports.length), tone: "blue" },
    { label: "Successful Migrations", value: String(successfulMigrations), tone: "green" },
    { label: "Latest Report", value: latestReport, tone: "purple" },
    { label: "Storage Used", value: storageUsed, tone: "orange" },
  ];

  return (
    <section className="reports-summary-grid" aria-label="Reports summary">
      {cards.map((card) => (
        <article key={card.label} className={`reports-summary-card reports-summary-card--${card.tone}`}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}
