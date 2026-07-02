import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface DependencySlice {
  name: string;
  value: number;
  color: string;
}

export default function DependencyChart({ data }: { data: DependencySlice[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <article className="discovery-card dependency-card">
      <div className="discovery-card-header">
        <h2>Dependency Analysis</h2>
      </div>
      <div className="dependency-chart-layout">
        <div className="dependency-chart">
          <ResponsiveContainer width="100%" height={245}>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={66} outerRadius={102} paddingAngle={2}>
                {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="dependency-chart-center">
            <strong>{total}</strong>
            <span>Total Dependencies</span>
          </div>
        </div>
        <div className="dependency-legend">
          {data.map((item) => {
            const percent = total ? Math.round((item.value / total) * 1000) / 10 : 0;
            return (
              <div className="dependency-legend-row" key={item.name}>
                <span style={{ backgroundColor: item.color }} />
                <strong>{item.name}</strong>
                <em>{item.value} ({percent}%)</em>
              </div>
            );
          })}
        </div>
      </div>
      <button className="discovery-subtle-button" type="button">View All Dependencies</button>
    </article>
  );
}
