import React from "react";
import { Box, Chip, Typography } from "@mui/material";

export default function MigrationDetails({ details = [] }) {
  return (
    <section className="migration-dashboard-card">
      <div className="migration-card-heading">
        <div>
          <h3>Migration Details</h3>
          <p>Repository and migration metadata for the current execution.</p>
        </div>
        <Chip size="small" label="Active" color="primary" variant="outlined" />
      </div>

      <Box className="migration-details-list">
        {details.map((item) => (
          <div className="migration-details-row" key={item.label}>
            <Typography component="span">{item.label}</Typography>
            <strong>{item.value || "Not available"}</strong>
          </div>
        ))}
      </Box>
    </section>
  );
}
