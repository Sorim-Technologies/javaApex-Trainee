import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apexLogo from "../../assets/logo.jpg";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import Support from "./Support";
import "./Layout.css";

type MockUser = {
  name: string;
  email: string;
  provider: string;
};

const MOCK_AUTH_STORAGE_KEY = "javapex_mock_user";
const APP_THEME_STORAGE_KEY = "javapex_theme";

type AppTheme = "ocean" | "emerald" | "ruby" | "mustard" | "tangerine" | "ash" | "cocoa";
type AppThemeSelection = "default" | AppTheme;
type AppMode = "light" | "dark";

const defaultThemeOption = {
  key: "default" as const,
  label: "Default Theme",
  description: "Uses your system Light/Dark preference",
  swatches: ["#f8fafc", "#38bdf8", "#020617"],
};

const themeOptions: Array<{
  key: AppTheme;
  label: string;
  description: string;
  swatches: string[];
}> = [
  {
    key: "ocean",
    label: "Ocean",
    description: "Blue enterprise glass",
    swatches: ["#2563eb", "#06b6d4", "#0f172a"],
  },
  {
    key: "emerald",
    label: "Emerald",
    description: "Green modernization",
    swatches: ["#059669", "#14b8a6", "#102a2a"],
  },
  {
    key: "ruby",
    label: "Ruby",
    description: "Bold red theme",
    swatches: ["#dc2626", "#f87171", "#450a0a"],
  },
  {
    key: "mustard",
    label: "Mustard",
    description: "Bright golden theme",
    swatches: ["#ca8a04", "#facc15", "#422006"],
  },
  {
    key: "tangerine",
    label: "Tangerine",
    description: "Bright citrus theme",
    swatches: ["#ea580c", "#fb923c", "#431407"],
  },
  {
    key: "ash",
    label: "Ash",
    description: "Balanced neutral theme",
    swatches: ["#4b5563", "#9ca3af", "#111827"],
  },
  {
    key: "cocoa",
    label: "Cocoa",
    description: "Warm cocoa theme",
    swatches: ["#92400e", "#d97706", "#3b2416"],
  },
];

const readMockUser = (): MockUser | null => {
  if (typeof window === "undefined") return null;

  try {
    const savedUser = window.localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
    return savedUser ? (JSON.parse(savedUser) as MockUser) : null;
  } catch {
    return null;
  }
};

const getSystemMode = (): AppMode => {
  if (typeof window === "undefined") return "dark";

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

const readAppTheme = (): AppThemeSelection => {
  if (typeof window === "undefined") return "default";

  const savedTheme = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
  if (savedTheme === "default") return "default";
  return themeOptions.some((theme) => theme.key === savedTheme) ? (savedTheme as AppTheme) : "default";
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [appTheme, setAppTheme] = useState<AppThemeSelection>(() => readAppTheme());
  const [systemMode, setSystemMode] = useState<AppMode>(() => getSystemMode());
  const [mockUser, setMockUser] = useState<MockUser | null>(() => readMockUser());
  const isDefaultTheme = appTheme === "default";

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowProfileMenu(false);
        setShowThemeMenu(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const userInitials = useMemo(() => {
    if (!mockUser) return "";

    return mockUser.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [mockUser]);

  const handleMockLogin = (provider: string) => {
    const user = {
      name: provider === "GitHub" ? "GitHub Demo User" : "JavaAPEX Demo User",
      email: provider === "GitHub" ? "github.user@example.com" : "demo.user@example.com",
      provider,
    };

    setMockUser(user);
    window.localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(user));
    setShowProfileMenu(false);
  };

  const handleLogout = () => {
    setMockUser(null);
    window.localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
    setShowProfileMenu(false);
    navigate("/");
  };

  const openSupport = () => {
    window.dispatchEvent(new Event("open-support-modal"));
  };

  const navigateToTheme = () => {
    setShowThemeMenu((current) => !current);
    setShowProfileMenu(false);
  };

  const selectTheme = (theme: AppThemeSelection) => {
    setAppTheme(theme);
    setShowThemeMenu(false);
  };

  const openSettings = () => {
    navigate("/");
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu((current) => !current);
    setShowThemeMenu(false);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((current) => !current);
  };

  useEffect(() => {
    window.localStorage.setItem(APP_THEME_STORAGE_KEY, appTheme);
  }, [appTheme]);

  useEffect(() => {
    if (!isDefaultTheme) {
      delete document.documentElement.dataset.mode;
      delete document.body.dataset.mode;
      return;
    }

    document.documentElement.dataset.mode = systemMode;
    document.body.dataset.mode = systemMode;

    return () => {
      delete document.documentElement.dataset.mode;
      delete document.body.dataset.mode;
    };
  }, [isDefaultTheme, systemMode]);

  useEffect(() => {
    const modeQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleModeChange = () => setSystemMode(getSystemMode());

    handleModeChange();
    modeQuery.addEventListener("change", handleModeChange);

    return () => modeQuery.removeEventListener("change", handleModeChange);
  }, []);

  const activeThemeClass = isDefaultTheme ? `app-shell--mode-${systemMode}` : `app-shell--theme-${appTheme}`;

  return (
    <div className={`app-shell ${activeThemeClass}`} data-theme={appTheme} data-mode={isDefaultTheme ? systemMode : undefined}>
      <header className="app-shell__header">
        <button className="app-shell__brand" type="button" onClick={() => navigate("/")}>
          <img src={apexLogo} alt="JavaAPEX" className="app-shell__logo" />
          <span className="app-shell__title">Full Migration</span>
        </button>

        <nav className="app-shell__nav" aria-label="Primary navigation">
          <button
            type="button"
            className={`app-shell__nav-button${location.pathname === "/docs" ? " app-shell__nav-button--active" : ""}`}
            onClick={() => navigate("/docs")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Docs</span>
          </button>

          <button type="button" className="app-shell__nav-button" onClick={openSupport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>Support</span>
          </button>

          <button
            type="button"
            className={`app-shell__profile-button${mockUser ? " app-shell__profile-button--signed-in" : ""}`}
            onClick={toggleProfileMenu}
            aria-expanded={showProfileMenu}
            aria-haspopup="menu"
            aria-label={mockUser ? `Profile menu for ${mockUser.name}` : "Open login menu"}
          >
            {mockUser ? (
              <span aria-hidden="true">{userInitials}</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </button>
        </nav>
      </header>

      <main className="app-shell__main">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          isAuthenticated={Boolean(mockUser)}
          onLogout={handleLogout}
          navigateToTheme={navigateToTheme}
          onOpenSettings={openSettings}
          onProfileToggle={toggleProfileMenu}
          isThemeOpen={showThemeMenu}
          isProfileOpen={showProfileMenu}
        />

        <div className={`app-shell__content ${isSidebarCollapsed ? "app-shell__content--collapsed" : ""}`}>{children}</div>
      </main>

      {showProfileMenu && (
        <>
          <button
            type="button"
            className="app-shell__menu-backdrop"
            aria-label="Close login menu"
            onClick={() => setShowProfileMenu(false)}
          />
          <div className="app-shell__profile-menu" role="menu">
            <div className="app-shell__profile-menu-header">
              <div className="app-shell__profile-title">
                {mockUser ? `Welcome, ${mockUser.name}` : "Welcome"}
              </div>
              <div className="app-shell__profile-subtitle">
                {mockUser ? `${mockUser.provider} session active` : "Sign in to continue"}
              </div>
            </div>

            <div className="app-shell__profile-menu-body">
              {mockUser ? (
                <>
                  <div className="app-shell__signed-in-card">
                    <strong>{mockUser.email}</strong>
                    <span>Frontend-only mock account</span>
                  </div>
                  <button
                    type="button"
                    className="app-shell__menu-action"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/docs");
                    }}
                  >
                    View documentation
                  </button>
                  <button
                    type="button"
                    className="app-shell__menu-action"
                    onClick={() => {
                      setShowProfileMenu(false);
                      openSupport();
                    }}
                  >
                    Contact support
                  </button>
                  <button type="button" className="app-shell__menu-action app-shell__menu-action--danger" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="app-shell__menu-action app-shell__menu-action--primary" onClick={() => handleMockLogin("Email")}>
                    Login
                  </button>
                  <button type="button" className="app-shell__menu-action" onClick={() => handleMockLogin("Signup")}>
                    Sign Up
                  </button>
                  <div className="app-shell__menu-divider">
                    <span>or continue with</span>
                  </div>
                  <div className="app-shell__social-row">
                    <button type="button" className="app-shell__social-button" onClick={() => handleMockLogin("Google")}>
                      Google
                    </button>
                    <button type="button" className="app-shell__social-button" onClick={() => handleMockLogin("GitHub")}>
                      GitHub
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {showThemeMenu && (
        <>
          <button
            type="button"
            className="app-shell__menu-backdrop"
            aria-label="Close theme menu"
            onClick={() => setShowThemeMenu(false)}
          />
          <div className="app-shell__theme-menu app-shell__theme-menu--modal" role="dialog" aria-modal="true" aria-label="Choose theme">
            <div className="app-shell__theme-menu-header">
              <div>
                <strong>Theme selector</strong>
                <p>Choose Default Light/Dark or a color theme.</p>
              </div>
              <button className="app-shell__theme-close" type="button" onClick={() => setShowThemeMenu(false)} aria-label="Close theme selector">
                ×
              </button>
            </div>
            <div className="app-shell__theme-options">
              <button
                type="button"
                className={`app-shell__theme-option app-shell__theme-option--default${isDefaultTheme ? " app-shell__theme-option--active" : ""}`}
                onClick={() => selectTheme("default")}
              >
                <span className="app-shell__theme-mode-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="3" />
                    <path d="M8 1v2" />
                    <path d="M8 13v2" />
                    <path d="M1 8h2" />
                    <path d="M13 8h2" />
                    <path d="m3.05 3.05 1.42 1.42" />
                    <path d="m11.53 11.53 1.42 1.42" />
                    <path d="M17 14a5 5 0 0 0 6 6 7 7 0 1 1-6-6Z" />
                  </svg>
                </span>
                <div className="app-shell__theme-copy">
                  <strong>{defaultThemeOption.label}</strong>
                  <span>{defaultThemeOption.description}</span>
                </div>
                {isDefaultTheme && <span className="app-shell__theme-check">{"\u2713"}</span>}
              </button>

              {themeOptions.map((theme) => (
                <button
                  key={theme.key}
                  type="button"
                  className={`app-shell__theme-option${theme.key === appTheme ? " app-shell__theme-option--active" : ""}`}
                  onClick={() => selectTheme(theme.key)}
                >
                  <span className="app-shell__theme-swatches">
                    {theme.swatches.map((swatch) => (
                      <span key={swatch} style={{ background: swatch }} />
                    ))}
                  </span>
                  <div className="app-shell__theme-copy">
                    <strong>{theme.label} theme</strong>
                    <span>{theme.description}</span>
                  </div>
                  {theme.key === appTheme && <span className="app-shell__theme-check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <Footer variant="light" fixed />
      <Support />
    </div>
  );
};

export default AppShell;
