import React from "react";
import useTheme from "../hooks/useTheme";
import MigrationWizard from "./MigrationWizard";

const RepositoryPage: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div style={{ minHeight: "100vh", background: theme === "dark" ? "#050816" : "#f8fafc" }}>
      <div style={{ width: "100%", maxWidth: 1440, margin: "0 auto", padding: "20px 24px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div>
            <p style={{ margin: 0, color: theme === "dark" ? "#94a3b8" : "#475569", fontSize: 14 }}>Authenticated dashboard</p>
            <h1 style={{ margin: "8px 0 0", fontSize: "clamp(28px, 3vw, 38px)", color: theme === "dark" ? "#f8fafc" : "#0f172a" }}>Repository Dashboard</h1>
          </div>
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: 1440, margin: "0 auto", padding: "0 24px 32px" }}>
        <MigrationWizard />
      </div>
    </div>
  );
};

export default RepositoryPage;
