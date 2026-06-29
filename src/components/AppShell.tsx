import React, { useEffect, useState } from "react";
import apexLogo from "../assets/logo.jpg";
import {
  clearStoredAppToken,
  getSocialCurrentUser,
  getStoredAppToken,
  guestLogin,
  logoutCurrentUser,
  setStoredAppToken,
  startSocialLogin,
} from "../services/socialAuthApi";
import type { AuthUser, OAuthProvider } from "../services/socialAuthApi";

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

const APP_AUTH_EVENT = "javaapex:open-auth-dropdown";
const APP_AUTH_CHANGED_EVENT = "javaapex:auth-changed";

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState("");
  const [hoveredAuthAction, setHoveredAuthAction] = useState<string | null>(null);
  const [guestLoginLoading, setGuestLoginLoading] = useState(false);

  useEffect(() => {
    const openAuthDropdown = () => setShowProfileMenu(true);
    window.addEventListener(APP_AUTH_EVENT, openAuthDropdown);

    return () => window.removeEventListener(APP_AUTH_EVENT, openAuthDropdown);
  }, []);

  useEffect(() => {
    const syncAuthFromStorage = () => {
      const token = getStoredAppToken();

      if (!token) {
        setAuthUser(null);
        return;
      }

      getSocialCurrentUser(token)
        .then((user) => {
          setAuthUser(user);
          setAuthError("");
        })
        .catch(() => {
          clearStoredAppToken();
          setAuthUser(null);
          setAuthError("Session expired. Please sign in again.");
        });
    };

    window.addEventListener(APP_AUTH_CHANGED_EVENT, syncAuthFromStorage);
    return () => window.removeEventListener(APP_AUTH_CHANGED_EVENT, syncAuthFromStorage);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("oauth_token");
    const token = oauthToken || getStoredAppToken();

    if (oauthToken) {
      setStoredAppToken(oauthToken);
      params.delete("oauth_token");
      const query = params.toString();
      const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    if (!token) return;

    getSocialCurrentUser(token)
      .then((user) => {
        setAuthUser(user);
        setAuthError("");
        window.dispatchEvent(new Event(APP_AUTH_CHANGED_EVENT));
      })
      .catch(() => {
        clearStoredAppToken();
        setAuthUser(null);
        setAuthError("Session expired. Please sign in again.");
        window.dispatchEvent(new Event(APP_AUTH_CHANGED_EVENT));
      });
  }, []);

  const handleSocialLogin = async (provider: OAuthProvider) => {
    setAuthError("");
    try {
      await startSocialLogin(provider);
    } catch (err: any) {
      setAuthError(err?.message || "Unable to start social login.");
    }
  };

  const handleGuestLogin = async () => {
    console.log("Guest login clicked");
    setAuthError("");
    setGuestLoginLoading(true);
    try {
      const response = await guestLogin();
      localStorage.setItem("app_auth_token", response.access_token);
      setAuthUser(response.user);
      setShowProfileMenu(false);
      window.dispatchEvent(new Event(APP_AUTH_CHANGED_EVENT));
      console.log("Guest login success");
    } catch (err: any) {
      setAuthError("Guest login failed. Please try again.");
    } finally {
      setGuestLoginLoading(false);
    }
  };

  const handleAppLogout = async () => {
    const token = getStoredAppToken();

    try {
      if (token) {
        await logoutCurrentUser(token);
      }
    } catch (error) {
      console.error("Logout API failed", error);
    } finally {
      clearStoredAppToken();
      setAuthUser(null);
      setAuthError("");
      setShowProfileMenu(false);
      window.dispatchEvent(new Event(APP_AUTH_CHANGED_EVENT));
    }
  };

  const providerLabel = (provider: string) =>
    provider.charAt(0).toUpperCase() + provider.slice(1);

  const authDropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: 48,
    right: 0,
    width: "min(396px, calc(100vw - 24px))",
    background: "#fff",
    borderRadius: 20,
    boxShadow: "0 28px 90px rgba(15, 23, 42, 0.22)",
    border: "1px solid #dbe3ef",
    zIndex: 1000,
    overflow: "hidden",
  };

  const authHeaderIconStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: 16,
    background: "linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)",
    border: "1px solid rgba(147, 197, 253, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 900,
    boxShadow: "0 14px 28px rgba(37, 99, 235, 0.28)",
  };

  const javaLogoIconStyle: React.CSSProperties = {
    ...authHeaderIconStyle,
    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    border: "1px solid #bfdbfe",
    color: "#1e3a8a",
    fontSize: 24,
    boxShadow: "0 8px 18px rgba(37, 99, 235, 0.12)",
    flexShrink: 0,
  };

  const authButtonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    minHeight: 46,
    padding: "12px 16px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    transition: "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease",
  };

  const socialButtonStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
    minHeight: 48,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#1e293b",
    fontSize: 14,
    fontWeight: 750,
    cursor: "pointer",
    transition: "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease",
  };

  const guestCardStyle: React.CSSProperties = {
    border: "1px solid #bfdbfe",
    borderRadius: 16,
    background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 58%, #dbeafe 100%)",
    padding: 14,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 10px 28px rgba(37, 99, 235, 0.10)",
  };

  const hoverLift = (key: string, style: React.CSSProperties): React.CSSProperties => ({
    ...style,
    ...(hoveredAuthAction === key
      ? {
          transform: "translateY(-1px)",
          boxShadow: "0 14px 30px rgba(15, 23, 42, 0.14)",
          borderColor: "#93c5fd",
          background: style.background === "#2563eb" || String(style.background).includes("#2563eb") ? "#1d4ed8" : "#f8fafc",
        }
      : {}),
  });

  const chevronStyle: React.CSSProperties = {
    color: "#94a3b8",
    fontSize: 18,
    fontWeight: 900,
    lineHeight: 1,
  };

  const providerLogoStyle: React.CSSProperties = {
    width: 18,
    height: 18,
    flexShrink: 0,
  };

  const providerLogo = (provider: OAuthProvider) => {
    if (provider === "github") {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={providerLogoStyle} aria-hidden="true">
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.13c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.98 10.98 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
        </svg>
      );
    }

    if (provider === "gitlab") {
      return (
        <svg viewBox="0 0 24 24" style={providerLogoStyle} aria-hidden="true">
          <path fill="#E24329" d="m12 22 4.1-12.6H7.9L12 22Z" />
          <path fill="#FC6D26" d="M12 22 7.9 9.4H2.2L12 22ZM21.8 9.4h-5.7L12 22l9.8-12.6Z" />
          <path fill="#FCA326" d="M2.2 9.4.9 13.3c-.1.4 0 .8.4 1.1L12 22 2.2 9.4ZM21.8 9.4 12 22l10.7-7.6c.3-.3.5-.7.4-1.1l-1.3-3.9Z" />
          <path fill="#E24329" d="M2.2 9.4h5.7L5.5 2.1c-.1-.4-.7-.4-.8 0L2.2 9.4ZM21.8 9.4h-5.7l2.4-7.3c.1-.4.7-.4.8 0l2.5 7.3Z" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" style={providerLogoStyle} aria-hidden="true">
        <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.43Z" />
        <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
        <path fill="#FBBC05" d="M6.41 13.89A6 6 0 0 1 6.1 12c0-.65.11-1.29.31-1.89V7.52H3.06A10 10 0 0 0 2 12c0 1.61.39 3.13 1.06 4.48l3.35-2.59Z" />
        <path fill="#EA4335" d="M12 5.99c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.52l3.35 2.59C7.2 7.75 9.4 5.99 12 5.99Z" />
      </svg>
    );
  };

  return (
    <div style={shellStyles.root}>
      <header style={shellStyles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={apexLogo} alt="Apex Logo" style={{ height: 40, width: "auto" }} />
          <span style={{ fontWeight: 900, color: "#1e293b", fontSize: 20 }}> Full Migration</span>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span title="Coming Soon" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "not-allowed", opacity: 0.6 }}>
            Docs
          </span>
          <span title="Coming Soon" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "not-allowed", opacity: 0.6 }}>
            Support
          </span>
          <div style={{ width: 1, height: 24, background: "#e2e8f0", margin: "0 4px" }} />

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
                border: "1px solid #e2e8f0",
                background: showProfileMenu ? "#f1f5f9" : "transparent",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title="Profile"
            >
              {authUser ? (
                <span style={{ color: "#2563eb", fontSize: 13, fontWeight: 800 }}>
                  {authUser.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              )}
            </button>

            {showProfileMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={() => setShowProfileMenu(false)} />
                <div
                  style={authDropdownStyle}
                >
                  <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #eef2f7", background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 13, minWidth: 0 }}>
                        <div style={authUser ? authHeaderIconStyle : javaLogoIconStyle}>
                          {authUser ? (
                            authUser.name.charAt(0).toUpperCase()
                          ) : (
                            <span aria-label="Java" role="img">
                              ☕
                            </span>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 17, fontWeight: 900, color: "#0f172a", letterSpacing: 0 }}>
                            {authUser ? `Welcome, ${authUser.name}` : "Welcome to javaAPEX"}
                          </div>
                          <div style={{ fontSize: 13, color: "#64748b", marginTop: 5, lineHeight: 1.45 }}>
                            {authUser
                              ? authUser.email
                              : "Sign in to connect repositories, execute automated migrations, and review reports."}
                          </div>
                        </div>
                      </div>
                      {!authUser && (
                        <span style={{ padding: "6px 9px", borderRadius: 999, background: "#ecfdf5", color: "#047857", fontSize: 11, fontWeight: 850, whiteSpace: "nowrap", border: "1px solid #bbf7d0" }}>
                          Secure access
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: 18 }}>
                    {authUser ? (
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
                          <div style={{ width: 54, height: 54, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#eff6ff", color: "#2563eb", fontSize: 20, fontWeight: 900, border: "1px solid #bfdbfe" }}>
                            {authUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: "#0f172a", fontSize: 15, fontWeight: 900 }}>{authUser.name}</div>
                            <div style={{ color: "#64748b", fontSize: 12, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis" }}>{authUser.email}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                          <div style={{ display: "inline-flex", alignItems: "center", padding: "7px 11px", borderRadius: 999, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 800 }}>
                            {providerLabel(authUser.provider)}
                          </div>
                          {authUser.role === "guest" ? (
                            <div style={{ display: "inline-flex", alignItems: "center", padding: "7px 11px", borderRadius: 999, background: "#fff7ed", color: "#c2410c", fontSize: 12, fontWeight: 800 }}>
                              Guest Mode
                            </div>
                          ) : (
                            <div style={{ display: "inline-flex", alignItems: "center", padding: "7px 11px", borderRadius: 999, background: "#ecfdf5", color: "#047857", fontSize: 12, fontWeight: 800 }}>
                              Full Access
                            </div>
                          )}
                          {authUser.role === "guest" && (
                            <div style={{ display: "inline-flex", alignItems: "center", padding: "7px 11px", borderRadius: 999, background: "#f8fafc", color: "#475569", fontSize: 12, fontWeight: 800 }}>
                              Remaining migrations: {authUser.remaining_migrations ?? 0}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleAppLogout}
                          onMouseEnter={() => setHoveredAuthAction("logout")}
                          onMouseLeave={() => setHoveredAuthAction(null)}
                          style={hoverLift("logout", { ...authButtonStyle, width: "100%", border: "1px solid #fecaca", background: "#fff", color: "#b91c1c" })}
                        >
                          Logout
                        </button>
                      </div>
                    ) : (
                      <>
                        {authError && (
                          <div style={{ padding: "10px 12px", borderRadius: 10, background: "#fef2f2", color: "#991b1b", fontSize: 12, marginBottom: 12, border: "1px solid #fecaca" }}>
                            {authError}
                          </div>
                        )}
                        <div style={guestCardStyle}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 9 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <div style={{ width: 30, height: 30, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#dbeafe", color: "#1d4ed8", fontWeight: 900 }}>G</div>
                              <div style={{ color: "#0f172a", fontSize: 14, fontWeight: 900 }}>Try as Guest</div>
                            </div>
                            <span style={{ padding: "6px 9px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontSize: 11, fontWeight: 850, whiteSpace: "nowrap" }}>
                              3 free migrations
                            </span>
                          </div>
                          <div style={{ color: "#475569", fontSize: 12.5, lineHeight: 1.45, marginBottom: 12 }}>
                            Explore javaAPEX instantly. Guest mode includes 3 free migrations.
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button
                              type="button"
                              onClick={handleGuestLogin}
                              disabled={guestLoginLoading}
                              onMouseEnter={() => setHoveredAuthAction("guest")}
                              onMouseLeave={() => setHoveredAuthAction(null)}
                              style={hoverLift("guest", { ...authButtonStyle, flex: 1, border: "1px solid #60a5fa", background: guestLoginLoading ? "#94a3b8" : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "#fff", cursor: guestLoginLoading ? "wait" : "pointer" })}
                            >
                              {guestLoginLoading ? "Signing in..." : "Continue as Guest"}
                            </button>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 13px" }}>
                          <div style={{ height: 1, background: "#e2e8f0", flex: 1 }} />
                          <span style={{ color: "#64748b", fontSize: 11, fontWeight: 850, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                            or continue with
                          </span>
                          <div style={{ height: 1, background: "#e2e8f0", flex: 1 }} />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                          <button type="button" style={hoverLift("github", socialButtonStyle)} onMouseEnter={() => setHoveredAuthAction("github")} onMouseLeave={() => setHoveredAuthAction(null)} onClick={() => handleSocialLogin("github")}>
                            {providerLogo("github")}
                            <span style={{ flex: 1, textAlign: "left" }}>Continue with GitHub</span>
                            <span style={chevronStyle}>›</span>
                          </button>
                          <button type="button" style={hoverLift("gitlab", socialButtonStyle)} onMouseEnter={() => setHoveredAuthAction("gitlab")} onMouseLeave={() => setHoveredAuthAction(null)} onClick={() => handleSocialLogin("gitlab")}>
                            {providerLogo("gitlab")}
                            <span style={{ flex: 1, textAlign: "left" }}>Continue with GitLab</span>
                            <span style={chevronStyle}>›</span>
                          </button>
                          <button type="button" style={hoverLift("google", socialButtonStyle)} onMouseEnter={() => setHoveredAuthAction("google")} onMouseLeave={() => setHoveredAuthAction(null)} onClick={() => handleSocialLogin("google")}>
                            {providerLogo("google")}
                            <span style={{ flex: 1, textAlign: "left" }}>Continue with Google</span>
                            <span style={chevronStyle}>›</span>
                          </button>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                          <button
                            type="button"
                            onClick={() => setAuthMode("login")}
                            onMouseEnter={() => setHoveredAuthAction("login")}
                            onMouseLeave={() => setHoveredAuthAction(null)}
                            style={hoverLift("login", {
                              ...authButtonStyle,
                              flex: 1,
                              border: "none",
                              background: "#2563eb",
                              color: "#fff",
                            })}
                          >
                            Login
                          </button>
                          <button
                            type="button"
                            onClick={() => setAuthMode("signup")}
                            onMouseEnter={() => setHoveredAuthAction("signup")}
                            onMouseLeave={() => setHoveredAuthAction(null)}
                            style={hoverLift("signup", {
                              ...authButtonStyle,
                              flex: 1,
                              border: "1px solid #e2e8f0",
                              background: "#fff",
                              color: "#334155",
                            })}
                          >
                            Sign Up
                          </button>
                        </div>
                        <div style={{ marginTop: 12, color: "#64748b", fontSize: 12, textAlign: "center", lineHeight: 1.45 }}>
                          Use social login for secure repository access.
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </nav>
      </header>

      <main style={shellStyles.main}>
        <div style={shellStyles.content}>{children}</div>
      </main>

      <footer style={shellStyles.footer}>
        <div style={shellStyles.footerContent}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={apexLogo} alt="Apex" style={{ height: 24, width: "auto" }} />
          </div>
          <span>© {new Date().getFullYear()} <a href="https://sorim.ai/">Sorim.ai</a></span>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;
