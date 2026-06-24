import React, { useState } from "react";
import useTheme from "../hooks/useTheme";
import apexLogo from "../assets/logo.jpg";
import { GITHUB_AUTH_LOGIN_URL } from "../services/api";
import {
  ensureFrontendAuthBypass,
  getActiveProfileUser,
  isFrontendAuthBypassEnabled,
} from "../services/frontendAuth";
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileUser, setProfileUser] = useState(() => {
    if (isFrontendAuthBypassEnabled()) {
      ensureFrontendAuthBypass();
    }
    return getActiveProfileUser();
  });
  const { theme, toggle } = useTheme();


  const handleAuthAction = () => {
    if (isFrontendAuthBypassEnabled()) {
      const nextUser = ensureFrontendAuthBypass();
      setProfileUser(nextUser ?? getActiveProfileUser());
      setShowProfileMenu(false);
      return;
    }

    window.location.href = GITHUB_AUTH_LOGIN_URL;
  };

  return (
    <div style={shellStyles.root}>
      <header style={shellStyles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 280px" }}>
          <img src={apexLogo} alt="Apex Logo" style={{ height: "clamp(38px, 4vw, 60px)", width: "auto", maxWidth: "min(267px, 52vw)", objectFit: "contain", flexShrink: 0 }} />
          <span style={{ fontWeight: 900, color: "var(--text)", fontSize: "clamp(18px, 2vw, 30px)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Full Migration</span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flex: "1 1 320px", flexWrap: "wrap", minWidth: 0 }}>
          <a
            href="https://github.com/sorimdevs-tech/java-migration-accelerator#readme"
            target="_blank"
            rel="noreferrer"
            title="Open documentation"
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Docs
          </a>
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1px solid var(--border)',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 16,
              color: 'var(--text)',
              transition: 'background 0.2s ease, transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-alt)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            {theme === 'dark' ? '??' : '??'}
          </button>

          {/* Profile Button with Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                  border: "1px solid var(--icon-border)",
                  background: showProfileMenu ? "rgba(0,0,0,0.04)" : "transparent",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,0,0,0.06)";
                  e.currentTarget.style.borderColor = "var(--icon-border)";
              }}
              onMouseLeave={(e) => {
                if (!showProfileMenu) {
                  e.currentTarget.style.background = "transparent";
                }
                  e.currentTarget.style.borderColor = "var(--icon-border)";
              }}
              title="Profile"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <>
                {/* Backdrop to close menu */}
                <div 
                  style={{ position: "fixed", inset: 0, zIndex: 999 }}
                  onClick={() => setShowProfileMenu(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 44,
                    right: 0,
                    width: "min(280px, calc(100vw - 32px))",
                    background: "var(--surface)",
                    borderRadius: 12,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                    border: "1px solid var(--border)",
                    zIndex: 1000,
                    overflow: "hidden"
                  }}
                >
                  {/* Header */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface-alt)" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                      {profileUser ? `Welcome, ${profileUser.name || profileUser.login}` : "Welcome"}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                      {isFrontendAuthBypassEnabled() ? "Frontend bypass is active" : "Sign in to continue"}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div style={{ padding: "12px" }}>
                    <button
                      title={isFrontendAuthBypassEnabled() ? "Continue with the local frontend session" : "Login with GitHub"}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 8,
                        border: "none",
                        background: isFrontendAuthBypassEnabled() ? "var(--surface-alt)" : "var(--border)",
                        color: "var(--text)",
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer",
                        opacity: 1,
                        marginBottom: 8
                      }}
                      onClick={handleAuthAction}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                        <polyline points="10 17 15 12 10 7"></polyline>
                        <line x1="15" y1="12" x2="3" y2="12"></line>
                      </svg>
                      Login
                    </button>

                    <button
                      title={isFrontendAuthBypassEnabled() ? "Open the local frontend session" : "Sign up with GitHub"}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--surface-alt)",
                        color: "var(--text)",
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer",
                        opacity: 1,
                        marginBottom: 12
                      }}
                      onClick={handleAuthAction}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                      Sign Up
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0" }}>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>or continue with</span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        title={isFrontendAuthBypassEnabled() ? "Use the local frontend session" : "Sign in with Google"}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--surface-alt)",
                          color: "var(--text)",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          opacity: 1
                        }}
                        onClick={handleAuthAction}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" style={{ opacity: 0.5 }}>
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                      </button>

                      <button
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          color: "var(--text)",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                        onClick={handleAuthAction}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--primary)";
                          e.currentTarget.style.color = "var(--surface)";
                          e.currentTarget.style.borderColor = "var(--primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--surface)";
                          e.currentTarget.style.color = "var(--text)";
                          e.currentTarget.style.borderColor = "var(--border)";
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
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

