import type { LucideIcon } from "lucide-react";

export interface AnalysisStat {
  label: string;
  value: string | number;
  detail?: string;
  tone: "blue" | "cyan" | "purple" | "green" | "orange" | "red";
  icon: LucideIcon;
}

export default function AnalysisCards({ stats }: { stats: AnalysisStat[] }) {
  return (
    <section className="discovery-stats-grid" aria-label="Repository analysis summary">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <article className="discovery-stat-card" key={stat.label}>
            <div className={`discovery-stat-icon ${stat.tone}`}>
              <Icon size={22} />
            </div>
            <div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              {stat.detail ? <small>{stat.detail}</small> : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
