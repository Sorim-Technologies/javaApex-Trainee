import { AlertCircle, Info, ShieldCheck } from "lucide-react";

export interface Recommendation {
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low" | "Info";
}

const iconMap = {
  High: AlertCircle,
  Medium: AlertCircle,
  Low: ShieldCheck,
  Info,
};

export default function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const Icon = iconMap[recommendation.priority];

  return (
    <article className="recommendation-card">
      <div className={`recommendation-icon ${recommendation.priority.toLowerCase()}`}>
        <Icon size={15} />
      </div>
      <div>
        <strong>{recommendation.title}</strong>
        <p>{recommendation.description}</p>
      </div>
      <span className={`priority-badge ${recommendation.priority.toLowerCase()}`}>
        {recommendation.priority}
      </span>
    </article>
  );
}
