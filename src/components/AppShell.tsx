import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apexLogo from "../assets/logo.jpg";
import Footer from "./Footer";
import "./AppShell.css";

type MockUser = {
  name: string;
  email: string;
  provider: string;
};

const MOCK_AUTH_STORAGE_KEY = "javapex_mock_user";

const readMockUser = (): MockUser | null => {
  if (typeof window === "undefined") return null;

  try {
    const savedUser = window.localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
    return savedUser ? (JSON.parse(savedUser) as MockUser) : null;
  } catch {
    return null;
  }
};

const supportTopics = [
  "Repository connection and GitHub access",
  "Java version recommendation questions",
  "Migration preview or execution issues",
  "Build modernization, testing, SonarQube, and FOSSA guidance",
];

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [mockUser, setMockUser] = useState<MockUser | null>(() => readMockUser());

  useEffect(() => {
    const openSupportModal = () => setShowSupportModal(true);
    window.addEventListener("open-support-modal", openSupportModal);

    return () => {
      window.removeEventListener("open-support-modal", openSupportModal);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowProfileMenu(false);
        setShowSupportModal(false);
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
  };

  return (
    <div className="app-shell">
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

          <button
            type="button"
            className="app-shell__nav-button"
            onClick={() => setShowSupportModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>Support</span>
          </button>

          <div className="app-shell__divider" aria-hidden="true" />

          <div className="app-shell__profile">
            <button
              type="button"
              className={`app-shell__profile-button${mockUser ? " app-shell__profile-button--signed-in" : ""}`}
              onClick={() => setShowProfileMenu((current) => !current)}
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

            {showProfileMenu && (
              <>
                <button
                  type="button"
                  className="app-shell__menu-backdrop"
                  aria-label="Close profile menu"
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
                            setShowSupportModal(true);
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
          </div>
        </nav>
      </header>

      <main className="app-shell__main">
        <div className="app-shell__content">{children}</div>
      </main>

      <Footer variant="light" fixed />

      {showSupportModal && (
        <div className="app-shell__modal-backdrop" role="presentation" onMouseDown={() => setShowSupportModal(false)}>
          <section
            className="app-shell__support-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="app-shell__support-header">
              <div>
                <div className="app-shell__support-eyebrow">Migration support center</div>
                <h2 id="support-modal-title">How can we help?</h2>
              </div>
              <button type="button" className="app-shell__modal-close" onClick={() => setShowSupportModal(false)} aria-label="Close support modal">
                ×
              </button>
            </div>

            <p className="app-shell__support-copy">
              This mock support panel is available without backend integration. Pick a topic below or use the sample contact details.
            </p>

            <div className="app-shell__support-topics">
              {supportTopics.map((topic) => (
                <button key={topic} type="button" onClick={() => setShowSupportModal(false)}>
                  {topic}
                </button>
              ))}
            </div>

            <div className="app-shell__support-contact">
              <div>
                <strong>Email</strong>
                <span>support@sorim.ai</span>
              </div>
              <div>
                <strong>Response time</strong>
                <span>Mock SLA: within 1 business day</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AppShell;
