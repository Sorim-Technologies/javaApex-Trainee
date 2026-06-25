import React, { useState, useEffect } from "react";
import apexLogo from "../assets/logo.jpg";
import { GITHUB_AUTH_LOGIN_URL } from "../services/api";
import { FaUserCircle } from "react-icons/fa";

const shellStyles: { [key: string]: React.CSSProperties } = {
  root: {
    minHeight: "100vh",
    background: "var(--background)",
    color: "var(--foreground)",
    display: "flex",
    flexDirection: "column",
    transition: "all 0.3s ease",
    overflow:"hidden"
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    background: "var(--glass-bg)",
    borderBottom: "1px solid var(--border)",
    padding: "12px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "var(--shadow-md)",
    backdropFilter: "var(--glass-blur)",
    WebkitBackdropFilter: "var(--glass-blur)",
    transition: "all 0.3s ease",
  },
  main: {
    flex: 1,
    padding: "24px 32px 32px",
     overflow: "hidden",
  },
  content: {
    maxWidth: "1440px",
    margin: "0 auto",
    width: "100%",
  },
  footer: {
    background: "var(--glass-bg)",
    borderTop: "1px solid var(--border)",
    padding: "18px 32px",
    backdropFilter: "var(--glass-blur)",
    WebkitBackdropFilter: "var(--glass-blur)",
  },
  footerContent: {
    maxWidth: "1440px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "var(--muted-foreground)",
    fontSize: "13px",
  },
};

const dropdownItemStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "var(--foreground)",
  fontSize: 13,
  fontWeight: 600,
  textAlign: "left",
  cursor: "pointer",
  transition: "all 0.2s ease"
};

const oauthButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 12,
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--foreground)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "var(--shadow-sm)",
  transition: "all 0.2s ease"
};

const inputFieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--foreground)",
  fontSize: 13,
  marginBottom: 10,
  outline: "none",
  transition: "all 0.2s ease"
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  color: "var(--muted-foreground)",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.5px"
};

const submitButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "var(--primary-gradient)",
  color: "white",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 6,
  boxShadow: "var(--shadow-sm)",
  transition: "all 0.2s ease"
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [notifications, setNotifications] = useState<string[]>([
    "Welcome to JavaApex Migration Accelerator!",
    "Verify your target repositories settings before execution.",
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Sub-views for the Profile Dropdown (Default OAuth, Login, Signup)
  const [authView, setAuthView] = useState<'default' | 'login' | 'signup'>('default');

  // Input states for Email Login & Sign Up
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Authenticated sessions loading
  const [githubUser, setGithubUser] = useState(() => {
    const raw = localStorage.getItem("github_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [gitlabUser, setGitlabUser] = useState(() => {
    const raw = localStorage.getItem("gitlab_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [googleUser, setGoogleUser] = useState(() => {
    const raw = localStorage.getItem("google_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [emailUser, setEmailUser] = useState(() => {
    const raw = localStorage.getItem("email_user");
    return raw ? JSON.parse(raw) : null;
  });

  const currentUser = githubUser || gitlabUser || googleUser || emailUser;
  const currentProvider = githubUser ? "GitHub" : gitlabUser ? "GitLab" : googleUser ? "Google" : emailUser ? "Email" : null;

  useEffect(() => {
    // We restrict the theme attribute to header and footer, not document.documentElement
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Sync state with storage to support immediate reflection on callbacks
  useEffect(() => {
    const syncAuth = () => {
      const gh = localStorage.getItem("github_user");
      const gl = localStorage.getItem("gitlab_user");
      const go = localStorage.getItem("google_user");
      const em = localStorage.getItem("email_user");
      setGithubUser(gh ? JSON.parse(gh) : null);
      setGitlabUser(gl ? JSON.parse(gl) : null);
      setGoogleUser(go ? JSON.parse(go) : null);
      setEmailUser(em ? JSON.parse(em) : null);
    };

    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  const handleLogout = () => {
    localStorage.removeItem("github_token");
    localStorage.removeItem("github_user");
    localStorage.removeItem("gitlab_token");
    localStorage.removeItem("gitlab_user");
    localStorage.removeItem("google_token");
    localStorage.removeItem("google_user");
    localStorage.removeItem("email_token");
    localStorage.removeItem("email_user");
    sessionStorage.clear();
    setGithubUser(null);
    setGitlabUser(null);
    setGoogleUser(null);
    setEmailUser(null);
    setShowProfileMenu(false);
    window.location.href = "/";
  };

  const handleGitLabLogin = () => {
    window.location.href = "/auth/callback?provider=gitlab&code=mock_gitlab_code";
  };

  const handleGoogleLogin = () => {
    window.location.href = "/auth/callback?provider=google&code=mock_google_code";
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Please fill in all fields.");
      return;
    }
    // Simulate authentication
    const mockUser = {
      name: email.split("@")[0],
      email: email,
      login: email.split("@")[0],
      avatar_url: ""
    };
    localStorage.setItem("email_token", "mock_email_token_12345");
    localStorage.setItem("email_user", JSON.stringify(mockUser));
    setEmailUser(mockUser);
    setShowProfileMenu(false);
    setAuthView('default');
    setEmail("");
    setPassword("");
    setAuthError("");
  };

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setAuthError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }
    // Simulate registration
    const mockUser = {
      name: name,
      email: email,
      login: email.split("@")[0],
      avatar_url: ""
    };
    localStorage.setItem("email_token", "mock_email_token_12345");
    localStorage.setItem("email_user", JSON.stringify(mockUser));
    setEmailUser(mockUser);
    setShowProfileMenu(false);
    setAuthView('default');
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAuthError("");
  };

  return (
    <div style={shellStyles.root}>
      <header style={shellStyles.header}>
        {/* Brand Logo & Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <img
              src={apexLogo}
              alt="Apex Logo"
              style={{
                height: 28,
                width: "auto",
                objectFit: "contain",
                borderRadius: 6,
                border: "1px solid rgba(59, 130, 246, 0.2)",
              }}
            />
            <div style={{
              position: "absolute",
              inset: -2,
              borderRadius: 8,
              border: "1.5px solid var(--primary)",
              opacity: 0.15,
            }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: 6 }}>
              javaAPEX
             
            </h3>
            <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>
              Java Migration Accelerator
            </p>
          </div>
        </div>

        {/* Global Action Menu */}
        <nav style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            title="Coming Soon"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              color: "var(--muted-foreground)",
              fontSize: 13,
              fontWeight: 600,
              background: "rgba(148, 163, 184, 0.05)",
              border: "1px solid var(--border)",
              cursor: "not-allowed",
              opacity: 0.8,
              transition: "all 0.2s ease"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            Docs
          </span>
          <span
            title="Coming Soon"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              color: "var(--muted-foreground)",
              fontSize: 13,
              fontWeight: 600,
              background: "rgba(148, 163, 184, 0.05)",
              border: "1px solid var(--border)",
              cursor: "not-allowed",
              opacity: 0.8,
              transition: "all 0.2s ease"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Support
          </span>

          <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />

         

          {/* Notifications Bell */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s ease"
              }}
              title="Notifications"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {notifications.length > 0 && (
                <span style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 8,
                  height: 8,
                  background: "var(--destructive)",
                  borderRadius: "50%",
                  border: "2px solid var(--card)"
                }} />
              )}
            </button>
            {showNotifications && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={() => setShowNotifications(false)} />
                <div style={{
                  position: "absolute",
                  top: 44,
                  right: 0,
                  width: 280,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 999,
                  padding: 12
                }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted-foreground)" }}>Notifications</div>
                  {notifications.map((n, idx) => (
                    <div key={idx} style={{ fontSize: 12, padding: "8px 0", borderBottom: idx < notifications.length - 1 ? "1px solid var(--border)" : "none", color: "var(--foreground)" }}>
                      {n}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />

          {/* User emoji profile trigger with dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: showProfileMenu ? "rgba(59, 130, 246, 0.1)" : "var(--card)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: 18,
                padding: 0,
                boxShadow: showProfileMenu ? "var(--shadow-md)" : "none",
              }}
              title="Account Options"
            >
              {currentUser && currentUser.avatar_url ? (
  <img
    src={currentUser.avatar_url}
    alt={currentUser.name || currentUser.login}
    style={{
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      objectFit: "cover",
    }}
  />
) : (
  <FaUserCircle size={26} color="#64748b" />
)}
            </button>

            {showProfileMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={() => setShowProfileMenu(false)} />
                <div style={{
                  position: "absolute",
                  top: 44,
                  right: 0,
                  width: 290,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  boxShadow: "var(--shadow-xl)",
                  zIndex: 1000,
                  overflow: "hidden",
                  padding: 16
                }}>
                  {currentUser ? (
                    /* Authenticated Dropdown Info */
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
                        {currentUser.avatar_url ? (
                          <img src={currentUser.avatar_url} style={{ width: 36, height: 36, borderRadius: "50%" }} alt="" />
                        ) : (
                          <span style={{ fontSize: 24 }}>👤</span>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {currentUser.name || currentUser.login}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {currentUser.email || `${currentUser.login}@domain.com`}
                          </div>
                          <div style={{ fontSize: 9, display: "inline-block", background: "rgba(59, 130, 246, 0.12)", color: "var(--primary)", padding: "1px 6px", borderRadius: 4, marginTop: 4, fontWeight: 700 }}>
                            {currentProvider} connected
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => { setShowProfileMenu(false); alert("Profile settings are coming soon."); }}
                        style={dropdownItemStyle}
                      >
                        👤 Profile
                      </button>
                      <button
                        onClick={() => { setShowProfileMenu(false); alert("Account integrations settings are coming soon."); }}
                        style={dropdownItemStyle}
                      >
                        ⚙️ Settings
                      </button>

                      <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />

                      <button
                        onClick={handleLogout}
                        style={{
                          ...dropdownItemStyle,
                          color: "var(--destructive)",
                        }}
                      >
                        🚪 Logout
                      </button>
                    </div>
                  ) : (
                    /* Non-Authenticated Dropdown Info */
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--foreground)", marginBottom: 4 }}>
                        Welcome to javaAPEX
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 14, lineHeight: 1.4 }}>
                        Sign in to connect repositories, execute automated migrations, and review reports.
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                        {/* GitHub OAuth Login */}
                        <button
                          onClick={() => { window.location.href = GITHUB_AUTH_LOGIN_URL; }}
                          style={oauthButtonStyle}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                          </svg>
                          Continue with GitHub
                        </button>

                        {/* GitLab OAuth Login */}
                        <button
                          onClick={handleGitLabLogin}
                          style={oauthButtonStyle}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path fill="#FC6D26" d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.415-.724-.415-.859 0l-2.664 8.189H7.574L4.91 1.263c-.135-.415-.724-.415-.859 0L1.387 9.452.045 13.587c-.12.37.007.777.317 1.002l11.638 8.455 11.638-8.455c.31-.225.437-.632.317-1.002z" />
                          </svg>
                          Continue with GitLab
                        </button>

                        {/* Google OAuth Login */}
                        <button
                          onClick={handleGoogleLogin}
                          style={oauthButtonStyle}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" style={{ marginRight: -2 }}>
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                        Continue with Google
                        </button>
                      </div>

                      <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => { setShowProfileMenu(false); alert("Signup coming soon."); }}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--foreground)",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "var(--secondary)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          Login
                        </button>
                        <button
                          onClick={() => { setShowProfileMenu(false); alert("Email login coming soon."); }}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "none",
                            background: "var(--primary-gradient)",
                            color: "white",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "opacity 0.2s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                        >
                          Sign Up
                        </button>
                      </div>
                    </div>
                  )}
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={apexLogo}
              alt="Apex Logo"
              style={{
                height: 28,
                width: "auto",
                objectFit: "contain",
                borderRadius: 6,
                border: "1px solid rgba(59, 130, 246, 0.2)",
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            © {new Date().getFullYear()} <a href="https://sorim.ai/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 600 }}>Sorim.ai</a>
          </span>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;
