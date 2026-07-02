import React from "react";
import { Box, Chip } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  Completed: "#10b981",
  "In Progress": "#2563eb",
  Pending: "#e5e7eb",
};

export default function MigrationProcessChart({ data = [] }) {
  const completed = data.find((item) => item.name === "Completed")?.value ?? 0;

  return (
    <section className="migration-dashboard-card">
      <div className="migration-card-heading">
        <div>
          <h3>Migration Process Overview</h3>
          <p>Live distribution of completed, active, and pending work.</p>
        </div>
        <Chip size="small" label={`${completed}% complete`} color="success" variant="outlined" />
      </div>

      <div className="migration-process-chart">
        <div className="migration-chart-wrap">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={65} outerRadius={92} paddingAngle={2} stroke="none">
                {data.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name] || "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="migration-chart-center">
            <strong>{completed}%</strong>
            <span>Completed</span>
          </div>
        </div>

        <Box className="migration-chart-legend">
          {data.map((item) => (
            <div key={item.name}>
              <span style={{ backgroundColor: COLORS[item.name] || "#94a3b8" }} />
              <strong>{item.name}</strong>
              <em>{item.value}%</em>
            </div>
          ))}
        </Box>
      </div>
    </section>
  );
}
