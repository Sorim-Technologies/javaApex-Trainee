import React, { useState, useEffect } from "react";
import { FiArrowRight, FiCheckCircle, FiGithub, FiSearch, FiShield, FiZap } from "react-icons/fi";
import Header from "./Header";
import Footer from "./Footer";
import apexLogo from "../../assets/apexlogo.png";
import { startSocialLogin } from "../../services/SocialAuthApi";

function LegacyLandingPage({ onStart }: { onStart: () => void }) {
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      minHeight: "100vw",
      backgroundColor: "#0f1419",
      color: "#ffffff",
      display: "flex",
      flexDirection: "column",
      width: "100vw",
      marginLeft: "calc(-50vw + 50%)",
      overflow: "hidden",
    },
    navbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "20px 40px",
      borderBottom: "1px solid #1e293b",
      backgroundColor: "rgba(15, 20, 25, 0.95)",
      backdropFilter: "blur(10px)",
    },
    logo: {
      fontSize: 24,
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      gap: 10,
      color: "#3b82f6",
    },
    navLinks: {
      display: "flex",
      gap: 30,
      alignItems: "center",
    },
    navLink: {
      color: "#e2e8f0",
      textDecoration: "none",
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      transition: "color 0.3s ease",
    },
    ctaButton: {
      backgroundColor: "#3b82f6",
      color: "#fff",
      padding: "12px 24px",
      borderRadius: 8,
      border: "none",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 14,
      transition: "all 0.3s ease",
      boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
    },
    hero: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      padding: "60px 40px",
      maxWidth: 1200,
      margin: "0 auto",
      width: "100%",
    },
    headline: {
      fontSize: 64,
      fontWeight: 800,
      marginBottom: 20,
      letterSpacing: "-1px",
      color: "#f8fafc",
    },
    highlightedText: {
      fontSize: 64,
      fontWeight: 800,
      background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      marginBottom: 30,
    },
    description: {
      fontSize: 18,
      color: "#cbd5e1",
      lineHeight: 1.8,
      maxWidth: 700,
      marginBottom: 40,
      fontWeight: 500,
    },
    ctaContainer: {
      display: "flex",
      gap: 20,
      marginBottom: 60,
    },
    secondaryButton: {
      backgroundColor: "transparent",
      color: "#e2e8f0",
      padding: "12px 24px",
      borderRadius: 8,
      border: "1px solid #4b5563",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 14,
      transition: "all 0.3s ease",
    },
    featuresGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 30,
      width: "100%",
      maxWidth: 1000,
      marginTop: 40,
      textAlign: "left",
    },
    featureCard: {
      padding: 30,
      backgroundColor: "#151b23",
      borderRadius: 12,
      border: "1px solid #212830",
    },
    featureIcon: {
      fontSize: 24,
      color: "#3b82f6",
      marginBottom: 16,
    },
    featureTitle: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 10,
      color: "#f8fafc",
    },
    featureDesc: {
      color: "#94a3b8",
      fontSize: 14,
      lineHeight: 1.6,
    },
  };

  return (
    <div style={styles.container}>
      <Header />
      <div style={styles.hero}>
        <h1 style={styles.headline}>Migrate Legacy Java Applications</h1>
        <h2 style={styles.highlightedText}>To Modern JDK Versions Automatically</h2>
        <p style={styles.description}>
          javaAPEX uses advanced OpenRewrite recipes to automatically refactor your legacy codebase,
          upgrade dependencies, optimize build scripts, and fix compile errors in minutes.
        </p>

        <div style={styles.ctaContainer}>
          <button style={styles.ctaButton} onClick={onStart}>
            Launch Migration Wizard
          </button>
          <button style={styles.secondaryButton}>View Documentation</button>
        </div>

        <div style={styles.featuresGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>⚡</div>
            <h3 style={styles.featureTitle}>Automated Upgrade</h3>
            <p style={styles.featureDesc}>
              Instantly upgrade from Java 8/11 to 17 or 21. Replaces deprecated APIs and updates build configs.
            </p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🛡️</div>
            <h3 style={styles.featureTitle}>Safe Transformations</h3>
            <p style={styles.featureDesc}>
              Our recipes are thoroughly tested and preserve existing business logic, structure, and behavior.
            </p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📊</div>
            <h3 style={styles.featureTitle}>Quality Analytics</h3>
            <p style={styles.featureDesc}>
              Includes post-migration SonarQube reports, test coverage validation, and regression tests.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function LandingPage({ onStart }: { onStart: () => void }) {
  const [user, setUser] = useState<any>(null);

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

  const handleLogout = () => {
    localStorage.removeItem("github_token");
    localStorage.removeItem("github_user");
    localStorage.removeItem("gitlab_token");
    localStorage.removeItem("gitlab_user");
    localStorage.removeItem("google_token");
    localStorage.removeItem("google_user");
    localStorage.removeItem("app_auth_token");
    setUser(null);
    window.location.reload();
  };

  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#f8fafc",
      color: "#0f172a",
      display: "flex",
      flexDirection: "column",
      width: "100%",
      overflow: "hidden",
      position: "relative",
    },
    heroSection: {
      padding: "100px 32px 80px",
      maxWidth: 1200,
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      zIndex: 2,
    },
    badge: {
      background: "linear-gradient(90deg, #dbeafe 0%, #eff6ff 100%)",
      border: "1px solid #bfdbfe",
      color: "#1d4ed8",
      padding: "6px 16px",
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 700,
      marginBottom: 28,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      boxShadow: "0 4px 12px rgba(37,99,235,0.05)",
    },
    headline: {
      fontSize: 54,
      fontWeight: 900,
      marginBottom: 20,
      letterSpacing: "-0.03em",
      color: "#0f172a",
      lineHeight: 1.15,
    },
    highlightedText: {
      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    description: {
      fontSize: 18,
      color: "#475569",
      lineHeight: 1.75,
      maxWidth: 760,
      marginBottom: 44,
      fontWeight: 500,
    },
    ctaContainer: {
      display: "flex",
      gap: 16,
      marginBottom: 80,
      flexWrap: "wrap",
      justifyContent: "center",
    },
    primaryBtn: {
      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
      color: "#fff",
      padding: "16px 32px",
      borderRadius: 12,
      border: "none",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 15,
      transition: "all 0.2s ease",
      boxShadow: "0 10px 25px rgba(37,99,235,0.25)",
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    secondaryBtn: {
      backgroundColor: "#fff",
      color: "#334155",
      padding: "16px 32px",
      borderRadius: 12,
      border: "1px solid #cbd5e1",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 15,
      transition: "all 0.2s ease",
      boxShadow: "0 4px 12px rgba(15,23,42,0.03)",
    },
    featuresGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: 28,
      width: "100%",
      maxWidth: 1100,
      margin: "0 auto 80px",
      textAlign: "left",
      zIndex: 2,
    },
    featureCard: {
      padding: 36,
      backgroundColor: "#fff",
      borderRadius: 16,
      border: "1px solid #e2e8f0",
      boxShadow: "0 10px 30px rgba(15,23,42,0.03)",
      transition: "all 0.3s ease",
    },
    featureIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: "#eff6ff",
      color: "#2563eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 22,
      marginBottom: 20,
    },
    featureTitle: {
      fontSize: 18,
      fontWeight: 800,
      marginBottom: 12,
      color: "#0f172a",
    },
    featureDesc: {
      color: "#475569",
      fontSize: 14,
      lineHeight: 1.6,
    },
    oauthRow: {
      marginTop: 20,
      width: "100%",
      maxWidth: 320,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      alignItems: "center"
    },
    oauthBtn: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: "12px 18px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#ffffff",
      color: "#334155",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      boxShadow: "0 4px 12px rgba(15,23,42,0.03)",
      transition: "all 0.2s ease"
    }
  };

  const handleOAuthLogin = (provider: string) => {
    if (provider === "github" || provider === "gitlab" || provider === "google") {
      startSocialLogin(provider as any)
        .catch((err) => alert(err.message || "Failed to initiate login."));
    }
  };

  return (
    <div style={styles.container}>
      <Header />
      
      <div style={styles.heroSection}>
        <div style={styles.badge}>
          <FiZap />
          V2.0 Released - Powered by OpenRewrite
        </div>
        
        <h1 style={styles.headline}>
          Modernize Legacy Java Apps<br />
          <span style={styles.highlightedText}>With Automated AI Refactoring</span>
        </h1>
        
        <p style={styles.description}>
          javaAPEX automates migrations from Java 8/11 to modern JDKs.
          Upgrade build configurations, fix dependencies, and modernize syntax instantly.
        </p>

        <div style={styles.ctaContainer}>
          <button
            style={styles.primaryBtn}
            onClick={onStart}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            Get Started Free
            <FiArrowRight />
          </button>
          
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>
                Signed in as <strong>{user.name || user.login}</strong> ({user.provider})
              </span>
              <button
                style={{
                  ...styles.oauthBtn,
                  background: "#fee2e2",
                  color: "#991b1b",
                  borderColor: "#fca5a5",
                }}
                onClick={handleLogout}
              >
                🚪 Log Out
              </button>
            </div>
          ) : (
            <div style={styles.oauthRow}>
              <button style={styles.oauthBtn} onClick={() => handleOAuthLogin("github")}>
                <FiGithub />
                Sign in with GitHub
              </button>
              <button style={styles.oauthBtn} onClick={() => handleOAuthLogin("gitlab")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path fill="#FC6D26" d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.415-.724-.415-.859 0l-2.664 8.189H7.574L4.91 1.263c-.135-.415-.724-.415-.859 0L1.387 9.452.045 13.587c-.12.37.007.777.317 1.002l11.638 8.455 11.638-8.455c.31-.225.437-.632.317-1.002z"/>
                </svg>
                Sign in with GitLab
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={styles.featuresGrid}>
        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>
            <FiZap />
          </div>
          <h3 style={styles.featureTitle}>Instant Dependency Resolution</h3>
          <p style={styles.featureDesc}>
            Detects outdated and security-vulnerable library structures, upgrading build.gradle and pom.xml automatically.
          </p>
        </div>

        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>
            <FiShield />
          </div>
          <h3 style={styles.featureTitle}>Continuous Code Quality</h3>
          <p style={styles.featureDesc}>
            Analyzes migrated source code through integrated SonarQube, FOSSA, and Unit testing suites.
          </p>
        </div>

        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>
            <FiSearch />
          </div>
          <h3 style={styles.featureTitle}>JMeter Performance Audits</h3>
          <p style={styles.featureDesc}>
            Tests working API pathways, verifying response times, throughput, and functionality parameters.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
