import React from "react";
import { BarChart3, AlertTriangle, FileCode2, Activity } from "lucide-react";
import type { ComplexitySummary } from "../../services/migrationService";

interface Props {
  summary: ComplexitySummary;
}

const cardStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: "12px",
  padding: "20px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  color: "#f9fafb",
  minWidth: "240px",
  flex: 1,
};

const iconContainer: React.CSSProperties = {
  width: "52px",
  height: "52px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const valueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
};

const titleStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#94a3b8",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: "20px",
  marginBottom: "24px",
};

export default function ComplexitySummary({ summary }: Props) {
  const cards = [
    {
      title: "Total Files",
      value: summary.totalFiles,
      icon: FileCode2,
      bg: "#1d4ed8",
    },
    {
      title: "Average Complexity",
      value: summary.averageComplexity,
      icon: Activity,
      bg: "#ca8a04",
    },
    {
      title: "Highest Complexity",
      value: summary.highestComplexity,
      icon: BarChart3,
      bg: "#ea580c",
    },
    {
      title: "Critical Files",
      value: summary.criticalFiles,
      icon: AlertTriangle,
      bg: "#dc2626",
    },
  ];

  return (
    <div style={gridStyle}>
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.title} style={cardStyle}>
            <div
              style={{
                ...iconContainer,
                background: card.bg,
              }}
            >
              <Icon size={24} color="white" />
            </div>

            <div>
              <div style={titleStyle}>{card.title}</div>

              <div style={valueStyle}>{card.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}