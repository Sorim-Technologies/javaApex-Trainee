import { AlertTriangle, CheckCircle2 } from "lucide-react";

export interface TechnologyRow {
  name: string;
  version: string;
  recommendation: "Up-to-date" | "Review" | "Outdated";
}

export default function TechnologyTable({ rows }: { rows: TechnologyRow[] }) {
  return (
    <article className="discovery-card technology-card">
      <div className="discovery-card-header">
        <h2>Technology Analysis</h2>
      </div>
      <div className="technology-table-wrap">
        <table className="technology-table">
          <thead>
            <tr>
              <th>Technology / Framework</th>
              <th>Detected Version</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const statusClass = row.recommendation === "Up-to-date" ? "good" : row.recommendation === "Outdated" ? "outdated" : "review";
              const isGood = row.recommendation === "Up-to-date";
              return (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.version}</td>
                  <td>
                    <span className={`technology-status ${statusClass}`}>
                      {isGood ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      {row.recommendation}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button className="discovery-subtle-button" type="button">View Full Technology Report</button>
    </article>
  );
}
