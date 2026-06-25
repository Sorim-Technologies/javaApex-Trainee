import React, { useState, useEffect } from "react";
import apexLogo from "../assets/logo.jpg";
import { GITHUB_AUTH_LOGIN_URL } from "../services/api";

type NotificationKind = "success" | "warning" | "error" | "info";

interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  time: string;
}

const NOTIFICATION_ITEMS_KEY = "java_apex_notifications";
const NOTIFICATION_EVENT_NAME = "java-apex-notification";

const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "repo-analyzed",
    kind: "success",
    title: "Repository analyzed successfully",
    message: "The repository structure, Java version, build tool, and frameworks were detected.",
    time: "Just now",
  },
  {
    id: "migration-plan-generated",
    kind: "info",
    title: "Migration plan generated",
    message: "A migration strategy is ready for review before starting code changes.",
    time: "5 min ago",
  },
  {
    id: "github-rate-limit",
    kind: "warning",
    title: "GitHub rate limit warning",
    message: "GitHub requests are close to the hourly limit. A token can improve reliability.",
    time: "12 min ago",
  },
  {
    id: "fossa-completed",
    kind: "success",
    title: "FOSSA scan completed",
    message: "Dependency license and open-source compliance checks are complete.",
    time: "18 min ago",
  },
  {
    id: "sonarqube-ready",
    kind: "info",
    title: "SonarQube report ready",
    message: "Quality metrics and maintainability findings are available in the report.",
    time: "25 min ago",
  },
];

const iconPaths = {
  bell: (
    <>
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8a6 6 0 0 0-12 0c0 4.499-1.411 5.956-2.738 7.326" />
    </>
  ),
  success: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  warning: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  check: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>
  ),
};

const LucideIcon: React.FC<{ name: keyof typeof iconPaths; size?: number }> = ({ name, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {iconPaths[name]}
  </svg>
);

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("notification_read_ids") || "[]");
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const storedNotifications = localStorage.getItem(NOTIFICATION_ITEMS_KEY);
      if (storedNotifications) {
        return JSON.parse(storedNotifications);
      }

      const clearedSampleIds = JSON.parse(localStorage.getItem("notification_cleared_ids") || "[]");
      return SAMPLE_NOTIFICATIONS.filter((notification) => !clearedSampleIds.includes(notification.id));
    } catch {
      return SAMPLE_NOTIFICATIONS;
    }
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const isDark = theme === "dark";
  const unreadCount = notifications.filter((notification) => !readNotificationIds.includes(notification.id)).length;

  useEffect(() => {
    localStorage.setItem("notification_read_ids", JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_ITEMS_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const detail = (event as CustomEvent<Partial<NotificationItem>>).detail;
      if (!detail?.title || !detail?.message || !detail?.kind) return;

      const notification: NotificationItem = {
        id: detail.id || `ui-${Date.now()}`,
        kind: detail.kind,
        title: detail.title,
        message: detail.message,
        time: detail.time || "Just now",
      };

      setNotifications((current) => [
        notification,
        ...current.filter((item) => item.id !== notification.id),
      ].slice(0, 20));
      setReadNotificationIds((current) => current.filter((id) => id !== notification.id));
    };

    window.addEventListener(NOTIFICATION_EVENT_NAME, handleNotification);
    return () => window.removeEventListener(NOTIFICATION_EVENT_NAME, handleNotification);
  }, []);

  const markNotificationRead = (notificationId: string) => {
    setReadNotificationIds((current) => (
      current.includes(notificationId) ? current : [...current, notificationId]
    ));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setReadNotificationIds([]);
    localStorage.setItem("notification_cleared_ids", JSON.stringify(SAMPLE_NOTIFICATIONS.map((notification) => notification.id)));
  };

  const restoreSampleNotifications = () => {
    setNotifications(SAMPLE_NOTIFICATIONS);
    setReadNotificationIds([]);
    localStorage.removeItem("notification_cleared_ids");
    localStorage.removeItem("notification_read_ids");
  };
  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      margin: 0,
      padding: 0,
      background: "var(--bg-primary)",
      display: "flex",
      flexDirection: "column",
      transition: "background-color 0.3s ease",
    }}>
      <header style={{
        background: "var(--bg-secondary)",
        borderBottom: "2px solid var(--border-color)",
        padding: "12px 32px",
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={apexLogo} alt="Apex Logo" style={{ height: 40, width: "auto" }} />
          <span style={{ fontWeight: 900, color: "var(--text-primary)", fontSize: 20, transition: "color 0.3s ease" }}> APEX Migration Studio</span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: `2px solid var(--border-color)`,
              background: isDark ? "#334155" : "transparent",
              cursor: "pointer",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "#475569" : "#f1f5f9";
              e.currentTarget.style.borderColor = "var(--border-hover)";
              e.currentTarget.style.transform = "rotate(20deg) scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? "#334155" : "transparent";
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.transform = "rotate(0deg) scale(1)";
            }}
            title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>

          <span 
            title="Coming Soon"
            className="hoverable-box"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 8,
              color: "var(--text-primary)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              cursor: "not-allowed",
              opacity: 0.7,
              boxShadow: "var(--shadow-soft)",
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
          </span>
          <div style={{ width: 1, height: 24, background: "var(--border-light)", margin: "0 4px" }} />
          
          <div style={{ position: "relative" }}>
            <button
              className="notification-bell-button"
              onClick={() => {
                setShowNotifications((current) => !current);
                setShowProfileMenu(false);
              }}
              title="Notifications"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "2px solid var(--border-color)",
                background: showNotifications ? "var(--bg-tertiary)" : "transparent",
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative",
              }}
            >
              <LucideIcon name="bell" size={18} />
              {unreadCount > 0 && <span className="notification-count-badge">{unreadCount}</span>}
            </button>

            {showNotifications && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 999 }}
                  onClick={() => setShowNotifications(false)}
                />
                <section className="notification-panel" aria-label="Notification Center">
                  <div className="notification-panel-header">
                    <div>
                      <div className="notification-panel-title">Notification Center</div>
                      <div className="notification-panel-subtitle">{unreadCount} unread updates</div>
                    </div>
                    <button
                      className="notification-action-button"
                      onClick={clearAllNotifications}
                      disabled={notifications.length === 0}
                      title="Clear all notifications"
                    >
                      <LucideIcon name="trash" size={15} />
                      Clear all
                    </button>
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty-state">
                        <LucideIcon name="bell" size={22} />
                        <span>No notifications right now</span>
                      </div>
                    ) : (
                      notifications.map((notification) => {
                        const isRead = readNotificationIds.includes(notification.id);

                        return (
                          <article
                            key={notification.id}
                            className={`notification-item notification-${notification.kind} ${
                              isRead ? "is-read" : "is-unread"
                            }`}
                          >
                            <div className="notification-icon-wrap">
                              <LucideIcon name={notification.kind} size={17} />
                            </div>
                            <div className="notification-content">
                              <div className="notification-row">
                                <h4>{notification.title}</h4>
                                {!isRead && <span className="notification-unread-dot" />}
                              </div>
                              <p>{notification.message}</p>
                              <div className="notification-meta-row">
                                <span>{notification.time}</span>
                                {!isRead && (
                                  <button
                                    className="notification-mark-read"
                                    onClick={() => markNotificationRead(notification.id)}
                                  >
                                    <LucideIcon name="check" size={14} />
                                    Mark read
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
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
                border: `2px solid var(--border-color)`,
                background: showProfileMenu ? "var(--bg-tertiary)" : "transparent",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-tertiary)";
                e.currentTarget.style.borderColor = "var(--border-hover)";
              }}
              onMouseLeave={(e) => {
                if (!showProfileMenu) {
                  e.currentTarget.style.background = "transparent";
                }
                e.currentTarget.style.borderColor = "var(--border-color)";
              }}
              title="Profile"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    width: 280,
                    background: "var(--bg-secondary)",
                    borderRadius: 12,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
                    border: `2px solid var(--border-color)`,
                    zIndex: 1000,
                    overflow: "hidden"
                  }}
                >
                  {/* Header */}
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid var(--border-light)`, background: "var(--bg-tertiary)" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Welcome</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Sign in to continue</div>
                  </div>

                  {/* Menu Items */}
                  <div style={{ padding: "12px" }}>
                    {/* Login Button - Disabled */}
                    <button
                      disabled
                      title="Coming Soon"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 8,
                        border: "none",
                        background: "#94a3b8",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "not-allowed",
                        opacity: 0.6,
                        marginBottom: 8
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                        <polyline points="10 17 15 12 10 7"></polyline>
                        <line x1="15" y1="12" x2="3" y2="12"></line>
                      </svg>
                      Login
                    </button>

                    {/* Sign Up Button - Disabled */}
                    <button
                      disabled
                      title="Coming Soon"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 8,
                        border: `1px solid var(--border-light)`,
                        background: "var(--bg-tertiary)",
                        color: "var(--text-faint)",
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "not-allowed",
                        opacity: 0.6,
                        marginBottom: 12
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                      Sign Up
                    </button>

                    {/* Divider */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0" }}>
                      <div style={{ flex: 1, height: 1, background: "var(--border-light)" }} />
                      <span style={{ fontSize: 12, color: "var(--text-faint)" }}>or continue with</span>
                      <div style={{ flex: 1, height: 1, background: "var(--border-light)" }} />
                    </div>

                    {/* Social Login Buttons */}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      {/* Google Sign In - Disabled */}
                      <button
                        disabled
                        title="Coming Soon"
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: `1px solid var(--border-light)`,
                          background: "var(--bg-tertiary)",
                          color: "var(--text-faint)",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "not-allowed",
                          opacity: 0.5
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" style={{ opacity: 0.5 }}>
                          <path fill="#9ca3af" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#9ca3af" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#9ca3af" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#9ca3af" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                      </button>

                      {/* GitHub Sign In */}
                      <button
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: `2px solid var(--border-color)`,
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                        onClick={() => {
                          window.location.href = GITHUB_AUTH_LOGIN_URL;
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isDark ? "#475569" : "#1e293b";
                          e.currentTarget.style.color = "#fff";
                          e.currentTarget.style.borderColor = isDark ? "#818cf8" : "#1e293b";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--bg-secondary)";
                          e.currentTarget.style.color = "var(--text-primary)";
                          e.currentTarget.style.borderColor = "var(--border-color)";
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

      <main style={{
        flex: 1,
        width: "100%",
        padding: 0,
        margin: 0,
      }}>
        <div style={{
          width: "100%",
          margin: 0,
          padding: 0,
        }}>
          {children}
        </div>
      </main>

      <footer style={{
        background: "var(--bg-secondary)",
        borderTop: "2px solid var(--border-color)",
        padding: "16px 32px",
        fontSize: 13,
        width: "100%",
        boxSizing: "border-box",
        transition: "all 0.3s ease",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "var(--text-muted)",
        }}>
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














