import React, { useState } from "react";
import apexLogo from "../assets/logo.jpg";
import { GITHUB_AUTH_LOGIN_URL } from "../services/api";

const shellStyles: { [key: string]: React.CSSProperties } = {
  root: {
    minHeight: "100vh",
    width: "100%",
    margin: 0,
    padding: 0,
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    padding: "12px 32px",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  main: {
    flex: 1,
    width: "100%",
    padding: 0,
    margin: 0,
  },
  content: {
    width: "100%",
    margin: 0,
    padding: 0,
  },
  footer: {
    background: "#fff",
    borderTop: "1px solid #e2e8f0",
    padding: "16px 32px",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
  },
  footerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#64748b",
  },
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <div style={shellStyles.root}>
<main style={shellStyles.main}>
        <div style={shellStyles.content}>
          {children}
        </div>
      </main>

      <footer style={shellStyles.footer}>
        <div style={shellStyles.footerContent}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={apexLogo} alt="Apex" style={{ height: 24, width: "auto" }} />
          </div>
          <span>Â© {new Date().getFullYear()} <a href="https://sorim.ai/">Sorim.ai</a></span>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;

