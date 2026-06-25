import React from "react";
import { useNavigate } from "react-router-dom";
import useTheme from "../hooks/useTheme";
import apexLogo from "../assets/logo.jpg";
import ChatbotLauncher from "./ChatbotLauncher";

const shellStyles: { [key: string]: React.CSSProperties } = {
  root: {
    minHeight: "100vh",
    width: "100%",
    margin: 0,
    padding: 0,
    overflowX: "clip",
    background: "var(--bg)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "var(--nav-bg)",
    color: "var(--text)",
    borderBottom: "1px solid var(--nav-border)",
    padding: "clamp(10px, 2vw, 16px) clamp(14px, 3vw, 30px)",
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
    overflowX: "clip",
  },
  content: {
    width: "100%",
    margin: 0,
    padding: 0,
  },
  footer: {
    background: "var(--footer-bg)",
    color: "var(--muted)",
    borderTop: "1px solid var(--footer-border)",
    padding: "14px 20px",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
  },
  footerContent: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    color: "var(--muted)",
  },
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  return (
    <div style={shellStyles.root}>
      <header style={shellStyles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 280px" }}>
          <img src={apexLogo} alt="Apex Logo" style={{ height: "clamp(38px, 4vw, 60px)", width: "auto", maxWidth: "min(267px, 52vw)", objectFit: "contain", flexShrink: 0 }} />
          <span style={{ fontWeight: 900, color: "var(--text)", fontSize: "clamp(18px, 2vw, 30px)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Full Migration</span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flex: "1 1 320px", flexWrap: "wrap", minWidth: 0 }}>
          <button
            onClick={() => navigate("/docs")}
            title="Open project understanding report"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              color: "var(--muted)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
              background: "transparent",
              cursor: "pointer",
              opacity: 0.9,
              border: "none"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Docs
          </button>
          <a
            href="https://github.com/sorimdevs-tech/java-migration-accelerator/issues"
            target="_blank"
            rel="noreferrer"
            title="Open support"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              color: "var(--muted)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
              background: "transparent",
              cursor: "pointer",
              opacity: 0.9
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            Support
          </a>
          <div style={{ width: 1, height: 24, background: "var(--nav-border)", margin: "0 4px" }} />

          {/* Theme Toggle */}
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid rgba(34, 211, 238, 0.5)",
              background: "rgba(255, 255, 255, 0.03)",
              color: "#22d3ee",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          {/* Profile Button */}
          <button
            onClick={() => navigate("/profile")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid rgba(34, 211, 238, 0.5)",
              background: "rgba(255, 255, 255, 0.03)",
              color: "#22d3ee",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            title="Profile"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>
        </nav>
      </header>

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
          <span>© {new Date().getFullYear()} <a href="https://sorim.ai/">Sorim.ai</a></span>
        </div>
      </footer>
      <ChatbotLauncher />
    </div>
  );
};

export default AppShell;

