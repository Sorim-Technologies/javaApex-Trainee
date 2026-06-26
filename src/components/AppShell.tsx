import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useTheme from "../hooks/useTheme";
import ChatbotLauncher from "./ChatbotLauncher";
import javaApexLogo from "../assets/javapexfinal.png";

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
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 50,
    width: "100%",
  },
  main: {
    width: "100%",
    padding: 0,
    paddingTop: "var(--app-nav-height, 62px)",
    paddingBottom: "18px",
    margin: 0,
    overflowX: "clip",
  },
  content: {
    width: "100%",
    margin: 0,
    padding: 0,
  },
  footer: {
    position: "relative",
    width: "100%",
    zIndex: 50,
    flexShrink: 0,
  },
  footerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
};

const DocumentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.6-.2-2.3H12v4.4h5.9c-.3 1.4-1 2.5-2.1 3.2v2.7h3.4c2-1.8 3.4-4.5 3.4-8z" />
    <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.4-2.7c-1 .6-2.2 1-3.9 1-3 0-5.5-2-6.4-4.7H2.1v2.8C3.9 20.4 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.6 13.9a6.6 6.6 0 0 1 0-3.8V7.3H2.1a11 11 0 0 0 0 9.4l3.5-2.8z" />
    <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A10.4 10.4 0 0 0 12 1 11 11 0 0 0 2.1 7.3l3.5 2.8C6.5 7.4 9 5.4 12 5.4z" />
  </svg>
);

const GitHubMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.9 4.7 19 5 19 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.8c0 .3.2.7.8.6A12 12 0 0 0 12 .5z" />
  </svg>
);

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [signedInProvider, setSignedInProvider] = useState<"Google" | "GitHub" | null>(null);

  const simulateLogin = (provider: "Google" | "GitHub") => {
    setSignedInProvider(provider);
    setIsLoginOpen(false);
  };

  return (
    <div style={shellStyles.root}>
      <header style={shellStyles.header} className="apex-top-nav">
        <div className="apex-top-nav-left">
          <button className="apex-brand" type="button" onClick={() => navigate("/")} aria-label="Open Java APEX dashboard">
            <span className="apex-brand-mark" aria-hidden="true">JA</span>
            <span className="apex-brand-title">JAVA APEX</span>
          </button>
          {/* <span className="apex-product-title">Full Migration</span> */}
        </div>

        <nav className="apex-top-nav-actions" aria-label="Application navigation">
          <button className="apex-nav-link" type="button" onClick={() => navigate("/docs")} title="Open Business Requirements Document">
            <DocumentIcon />
            <span>Docs</span>
          </button>

          <a className="apex-nav-link apex-support-link" href="https://github.com/sorimdevs-tech/java-migration-accelerator/issues" target="_blank" rel="noreferrer" title="Open support">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>Support</span>
          </a>

          <div className="apex-nav-divider" aria-hidden="true" />

          <button className="apex-icon-button" type="button" onClick={toggle} title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
            <span aria-hidden="true">{theme === "dark" ? "LT" : "DK"}</span>
          </button>

          <div className="apex-login-menu">
            <button className={`apex-login-button ${signedInProvider ? "is-signed-in" : ""}`} type="button" onClick={() => setIsLoginOpen((open) => !open)} aria-haspopup="menu" aria-expanded={isLoginOpen}>
              <UserIcon />
              <span>{signedInProvider ? signedInProvider : "Login"}</span>
            </button>
            {isLoginOpen && (
              <div className="apex-login-dropdown" role="menu">
                <button type="button" role="menuitem" onClick={() => simulateLogin("Google")}>
                  <GoogleMark />
                  <span>Sign in with Google</span>
                </button>
                <button type="button" role="menuitem" onClick={() => simulateLogin("GitHub")}>
                  <GitHubMark />
                  <span>Sign in with GitHub</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main style={shellStyles.main}>
        <div style={shellStyles.content}>{children}</div>
      </main>

      <footer style={shellStyles.footer} className="apex-bottom-bar">
        <div style={shellStyles.footerContent} className="apex-bottom-content">
          <button className="apex-bottom-brand" type="button" onClick={() => navigate("/")} aria-label="Open Java APEX dashboard">
            <img src={javaApexLogo} alt="Java APEX" />
          </button>
          <span className="apex-bottom-copy">(c) {new Date().getFullYear()} Sorim.ai</span>
        </div>
      </footer>
      <ChatbotLauncher />
    </div>
  );
};

export default AppShell;
