import React from "react";
import {
  X,
  FileCode2,
  Activity,
  Package,
  AlertTriangle,
} from "lucide-react";
import type { ComplexityFile } from "../../services/migrationService";

interface Props {
  file: ComplexityFile | null;
  onClose: () => void;
}

export default function ComplexityDetailsPanel({
  file,
  onClose,
}: Props) {
  if (!file) return null;

  const getBadgeColor = () => {
    switch (file.level) {
      case "Low":
        return "#22c55e";
      case "Medium":
        return "#eab308";
      case "High":
        return "#f97316";
      case "Critical":
        return "#ef4444";
      default:
        return "#64748b";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 420,
        height: "100vh",
        background: "#0f172a",
        borderLeft: "1px solid #334155",
        zIndex: 9999,
        color: "#f8fafc",
        overflowY: "auto",
        boxShadow: "-8px 0 25px rgba(0,0,0,.4)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #334155",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
          }}
        >
          Complexity Details
        </h2>

        <X
          size={22}
          style={{ cursor: "pointer" }}
          onClick={onClose}
        />
      </div>

      <div style={{ padding: 24 }}>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 30,
          }}
        >
          <FileCode2 color="#60a5fa" />

          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              {file.file}
            </div>

            <div
              style={{
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              {file.package}
            </div>
          </div>
        </div>

        <InfoCard
          icon={<Activity color="#22c55e" />}
          title="Complexity Score"
          value={file.complexity.toString()}
        />

        <InfoCard
          icon={<Package color="#38bdf8" />}
          title="Package"
          value={file.package}
        />

        <InfoCard
          icon={<AlertTriangle color={getBadgeColor()} />}
          title="Risk Level"
          value={file.level}
        />

        <div
          style={{
            marginTop: 30,
          }}
        >
          <h3>Recommendation</h3>

          <div
            style={{
              background: "#1e293b",
              padding: 16,
              borderRadius: 10,
              borderLeft: `5px solid ${getBadgeColor()}`,
              lineHeight: 1.7,
            }}
          >
            {file.level === "Low" &&
              "This file has low complexity and should migrate without issues."}

            {file.level === "Medium" &&
              "Review this file before migration. Some methods may require manual validation."}

            {file.level === "High" &&
              "This file contains several decision paths. Additional testing is recommended after migration."}

            {file.level === "Critical" &&
              "This file is highly complex. Consider refactoring before migration to reduce migration risk and improve maintainability."}
          </div>
        </div>

        <div
          style={{
            marginTop: 30,
          }}
        >
          <h3>Metrics</h3>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <tbody>
              <Row
                label="Complexity"
                value={file.complexity.toString()}
              />

              <Row
                label="Risk"
                value={file.level}
              />

              <Row
                label="Package"
                value={file.package}
              />

              <Row
                label="Path"
                value={file.path}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 15,
      }}
    >
      {icon}

      <div>
        <div
          style={{
            color: "#94a3b8",
            fontSize: 12,
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontWeight: 700,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <tr>
      <td
        style={{
          padding: "10px 0",
          color: "#94a3b8",
        }}
      >
        {label}
      </td>

      <td
        style={{
          textAlign: "right",
          fontWeight: 600,
        }}
      >
        {value}
      </td>
    </tr>
  );
}