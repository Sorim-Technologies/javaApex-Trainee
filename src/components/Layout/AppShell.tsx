import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiTerminal } from "react-icons/fi";
import apexLogo from "../../assets/logo.jpg";
import { startSocialLogin } from "../../services/SocialAuthApi";
import { FaUserCircle } from "react-icons/fa";

const shellStyles: { [key: string]: React.CSSProperties } = {
  root: {
    minHeight: "100vh",
    background: "var(--background)",
    color: "var(--foreground)",
    display: "flex",
    flexDirection: "column",
    transition: "background-color 0.3s ease, color 0.3s ease",
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
  outline: "none",
  transition: "border 0.2s ease"
};

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "light";
    }
    return "light";
  });

  const [user, setUser] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDirectLogin, setShowDirectLogin] = useState(false);
  
  // Custom states for manual token login bypass option
  const [gitlabTokenInput, setGitlabTokenInput] = useState("");
  const [googleTokenInput, setGoogleTokenInput] = useState("");
  const [activeTab, setActiveTab] = useState<"github" | "gitlab" | "google">("github");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Read logged-in user profile states
  useEffect(() => {
    const ghUser = localStorage.getItem("github_user");
    const glUser = localStorage.getItem("gitlab_user");
    const ggUser = localStorage.getItem("google_user");

    if (ghUser) {
      setUser({ ...JSON.parse(ghUser), provider: "GitHub" });
    } else if (glUser) {
      setUser({ ...JSON.parse(glUser), provider: "GitLab" });
    } else if (ggUser) {
      setUser({ ...JSON.parse(ggUser), provider: "Google" });
    } else {
      setUser(null);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleLogout = () => {
    localStorage.removeItem("github_token");
    localStorage.removeItem("github_user");
    localStorage.removeItem("gitlab_token");
    localStorage.removeItem("gitlab_user");
    localStorage.removeItem("google_token");
    localStorage.removeItem("google_user");
    setUser(null);
    setShowProfileMenu(false);
    window.location.href = "/";
  };

  const handleOAuthLogin = (provider: string) => {
    if (provider === "github" || provider === "gitlab" || provider === "google") {
      startSocialLogin(provider as any)
        .catch((err) => alert(err.message || "Failed to initiate login."));
    }
  };

  const handleManualTokenSubmit = (provider: "gitlab" | "google") => {
    const token = provider === "gitlab" ? gitlabTokenInput : googleTokenInput;
    if (!token.trim()) {
      alert(`Please enter a valid developer API token for ${provider === "gitlab" ? "GitLab" : "Google"}`);
      return;
    }

    const mockUser = {
      login: `${provider}-developer`,
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Token User`,
      avatar_url: provider === "gitlab" 
        ? "https://gitlab.com/uploads/-/system/user/avatar/gitlab-avatar.png"
        : "https://lh3.googleusercontent.com/a/default-user=s96-c",
      email: `${provider}-dev@sorim.ai`
    };

    localStorage.setItem(`${provider}_token`, token.trim());
    localStorage.setItem(`${provider}_user`, JSON.stringify(mockUser));
    setUser({ ...mockUser, provider: provider.charAt(0).toUpperCase() + provider.slice(1) });
    setShowProfileMenu(false);
    setShowDirectLogin(false);
    alert(`Connected securely to ${provider.toUpperCase()} via personal developer token.`);
    window.location.reload();
  };

  return (
    <div style={shellStyles.root}>
      <header style={shellStyles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src={apexLogo}
            alt="Apex Logo"
            style={{
              height: 38,
              width: "auto",
              objectFit: "contain",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(37,99,235,0.12)",
            }}
          />
          <div>
            <span
              style={{
                fontSize: "17px",
                fontWeight: 800,
                color: "var(--foreground)",
                letterSpacing: "-0.02em",
                display: "block"
              }}
            >
              javaAPEX
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--primary)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "block",
                marginTop: 2
              }}
            >
              Migration Suite
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Migration Flow Link */}
          <button
            onClick={() => navigate(window.sessionStorage.getItem("last_wizard_path") || "/")}
            style={{
              background: location.pathname !== "/progress" ? "rgba(59, 130, 246, 0.1)" : "transparent",
              border: location.pathname !== "/progress" ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid var(--border)",
              color: location.pathname !== "/progress" ? "var(--primary)" : "var(--foreground)",
              borderRadius: 8,
              padding: "0 16px",
              height: 38,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              transition: "all 0.2s ease"
            }}
          >
           
            Migration Flow
          </button>

          {/* Logs Link */}
          <button
            onClick={() => navigate("/progress")}
            style={{
              background: location.pathname === "/progress" ? "rgba(59, 130, 246, 0.1)" : "transparent",
              border: location.pathname === "/progress" ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid var(--border)",
              color: location.pathname === "/progress" ? "var(--primary)" : "var(--foreground)",
              borderRadius: 8,
              padding: "0 16px",
              height: 38,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              transition: "all 0.2s ease"
            }}
          >
           
            Logs
          </button>

          <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />

          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              borderRadius: 8,
              width: 38,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--secondary)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          <div style={{ position: "relative" }}>
            {user ? (
              <button
                onClick={() => { setShowProfileMenu(!showProfileMenu); setShowDirectLogin(false); }}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "5px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  color: "var(--foreground)",
                  height: 38,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--secondary)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || user.login}
                    style={{ width: 24, height: 24, borderRadius: "50%" }}
                  />
                ) : (
                  <FaUserCircle size={20} style={{ color: "var(--muted-foreground)" }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {user.name || user.login}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    background: "var(--secondary)",
                    borderRadius: 6,
                    color: "var(--muted-foreground)",
                    fontWeight: 600
                  }}
                >
                  {user.provider}
                </span>
              </button>
            ) : (
              <button
                onClick={() => { setShowDirectLogin(!showDirectLogin); setShowProfileMenu(false); }}
                style={{
                  background: "var(--primary-gradient)",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  padding: "0 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  height: 38,
                  boxShadow: "0 4px 14px rgba(37,99,235,0.22)",
                  transition: "opacity 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.95"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                Sign In
              </button>
            )}

            {/* Profile Dropdown */}
            {showProfileMenu && user && (
              <div
                style={{
                  position: "absolute",
                  top: 46,
                  right: 0,
                  width: 220,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  boxShadow: "var(--shadow-lg)",
                  padding: 8,
                  zIndex: 2000,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4
                }}
              >
                <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Signed in as</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.email || user.login}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  style={dropdownItemStyle}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--secondary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  🚪 Log Out
                </button>
              </div>
            )}

            {/* Provider Login Overlay Modal */}
            {showDirectLogin && !user && (
              <div
                style={{
                  position: "absolute",
                  top: 46,
                  right: 0,
                  width: 320,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  boxShadow: "var(--shadow-lg)",
                  padding: 20,
                  zIndex: 2000,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Select Authentication</span>
                  <button
                    onClick={() => setShowDirectLogin(false)}
                    style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 16 }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: "flex", borderBottom: "1px solid var(--border)", paddingBottom: 10, gap: 12 }}>
                  <button
                    onClick={() => setActiveTab("github")}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      color: activeTab === "github" ? "var(--primary)" : "var(--muted-foreground)",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      paddingBottom: 6,
                      borderBottom: activeTab === "github" ? "2px solid var(--primary)" : "none"
                    }}
                  >
                    GitHub
                  </button>
                  <button
                    onClick={() => setActiveTab("gitlab")}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      color: activeTab === "gitlab" ? "var(--primary)" : "var(--muted-foreground)",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      paddingBottom: 6,
                      borderBottom: activeTab === "gitlab" ? "2px solid var(--primary)" : "none"
                    }}
                  >
                    GitLab
                  </button>
                  <button
                    onClick={() => setActiveTab("google")}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      color: activeTab === "google" ? "var(--primary)" : "var(--muted-foreground)",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      paddingBottom: 6,
                      borderBottom: activeTab === "google" ? "2px solid var(--primary)" : "none"
                    }}
                  >
                    Google
                  </button>
                </div>

                {activeTab === "github" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <button
                      onClick={() => handleOAuthLogin("github")}
                      style={oauthButtonStyle}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--secondary)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "var(--card)"}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                      </svg>
                      Sign In with GitHub OAuth
                    </button>
                    <p style={{ color: "var(--muted-foreground)", fontSize: 11, margin: 0, textAlign: "center", lineHeight: 1.4 }}>
                      Uses secure official integration flow to access repositories.
                    </p>
                  </div>
                )}

                {activeTab === "gitlab" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <button
                      onClick={() => handleOAuthLogin("gitlab")}
                      style={oauthButtonStyle}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--secondary)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "var(--card)"}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path fill="#FC6D26" d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.415-.724-.415-.859 0l-2.664 8.189H7.574L4.91 1.263c-.135-.415-.724-.415-.859 0L1.387 9.452.045 13.587c-.12.37.007.777.317 1.002l11.638 8.455 11.638-8.455c.31-.225.437-.632.317-1.002z"/>
                      </svg>
                      Sign In with GitLab OAuth
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
                      <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border)" }} />
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 700 }}>OR USE PAT</span>
                      <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border)" }} />
                    </div>

                    <input
                      type="password"
                      placeholder="GitLab Personal Access Token"
                      value={gitlabTokenInput}
                      onChange={(e) => setGitlabTokenInput(e.target.value)}
                      style={inputFieldStyle}
                    />

                    <button
                      onClick={() => handleManualTokenSubmit("gitlab")}
                      style={{
                        padding: "10px 14px",
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
                      Connect with Token
                    </button>
                  </div>
                )}

                {activeTab === "google" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <button
                      onClick={() => handleOAuthLogin("google")}
                      style={oauthButtonStyle}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--secondary)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "var(--card)"}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 2 }}>
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.98h6.61c-.3 1.53-1.18 2.82-2.52 3.68v3.02h4.03c2.37-2.17 3.625-5.38 3.625-8.61z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.03-3.02c-1.18.79-2.69 1.27-3.93 1.27-3.03 0-5.6-2.05-6.52-4.81H1.31v3.11C3.29 21.6 7.37 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.48 14.53A7.16 7.16 0 0 1 5.08 12c0-.88.15-1.74.4-2.53V6.36H1.31A11.96 11.96 0 0 0 0 12c0 2.06.52 4 1.31 5.64l4.17-3.11z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.37 0 3.29 2.4 1.31 6.36l4.17 3.11c.92-2.76 3.49-4.72 6.52-4.72z"/>
                      </svg>
                      Sign In with Google OAuth
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
                      <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border)" }} />
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 700 }}>OR USE PAT</span>
                      <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border)" }} />
                    </div>

                    <input
                      type="password"
                      placeholder="Google Developer API Token"
                      value={googleTokenInput}
                      onChange={(e) => setGoogleTokenInput(e.target.value)}
                      style={inputFieldStyle}
                    />

                    <button
                      onClick={() => handleManualTokenSubmit("google")}
                      style={{
                        padding: "10px 14px",
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
                      Connect with Token
                    </button>
                  </div>
                )}

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setShowDirectLogin(false); handleOAuthLogin("github"); }}
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
                    onClick={() => { setShowDirectLogin(false); alert("Email login coming soon."); }}
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
        </div>
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
