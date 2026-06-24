import React from "react";
import { FiArrowRight, FiCheckCircle, FiGithub, FiSearch, FiShield, FiZap } from "react-icons/fi";
import Header from "./Header";
import Footer from "./Footer";
import apexLogo from "../assets/apexlogo.png";
import { GITHUB_AUTH_LOGIN_URL } from "../services/api";

function LegacyLandingPage({ onStart }: { onStart: () => void }) {
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      minHeight: "100vh",
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
      justifyContent: "center",
      marginBottom: 40,
    },
    primaryBtn: {
      backgroundColor: "#3b82f6",
      color: "#fff",
      padding: "16px 40px",
      borderRadius: 8,
      border: "none",
      fontWeight: 700,
      fontSize: 16,
      cursor: "pointer",
      transition: "all 0.3s ease",
      boxShadow: "0 8px 16px rgba(59, 130, 246, 0.4)",
    },
    secondaryBtn: {
      backgroundColor: "transparent",
      color: "#3b82f6",
      padding: "16px 40px",
      borderRadius: 8,
      border: "2px solid #3b82f6",
      fontWeight: 700,
      fontSize: 16,
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    versionInfo: {
      fontSize: 14,
      color: "#94a3b8",
      marginBottom: 60,
    },
    features: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: 30,
      width: "100%",
      marginBottom: 60,
    },
    featureCard: {
      padding: 24,
      borderRadius: 12,
      border: "1px solid #1e293b",
      backgroundColor: "rgba(30, 41, 59, 0.3)",
      transition: "all 0.3s ease",
    },
    featureIcon: {
      fontSize: 32,
      marginBottom: 12,
    },
    featureTitle: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 10,
      color: "#f8fafc",
    },
    featureDesc: {
      fontSize: 14,
      color: "#cbd5e1",
      lineHeight: 1.6,
    },
    footer: {
      borderTop: "1px solid #1e293b",
      padding: "40px",
      textAlign: "center",
      backgroundColor: "rgba(15, 20, 25, 0.5)",
      fontSize: 14,
      color: "#94a3b8",
    },
    poweredBy: {
      marginTop: 20,
      fontSize: 13,
      color: "#64748b",
    },
  };

  return (
    <div style={styles.container}>
      <Header />

      {/* Hero Section */}
      <div style={styles.hero}>
        <h1 style={styles.headline}>Modernize Your</h1>
        <div style={styles.highlightedText}>Java Applications</div>
        
        <p style={styles.description}>
          Accelerate your Java application migration with automated tools and intelligent refactoring. 
          Upgrade to newer Java versions with minimal effort and maximum reliability. 
          Reduce technical debt and improve performance across your entire codebase.
        </p>

        {/* Features Grid */}
        <div style={styles.features}>
          <div style={styles.featureCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = "1px solid #3b82f6";
              e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = "1px solid #1e293b";
              e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.3)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={styles.featureIcon}>⚡</div>
            <div style={styles.featureTitle}>Fast Migration</div>
            <div style={styles.featureDesc}>Automated refactoring and code transformation in minutes</div>
          </div>

          <div style={styles.featureCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = "1px solid #3b82f6";
              e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = "1px solid #1e293b";
              e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.3)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={styles.featureIcon}>🔍</div>
            <div style={styles.featureTitle}>Deep Analysis</div>
            <div style={styles.featureDesc}>Comprehensive dependency and compatibility scanning</div>
          </div>

          <div style={styles.featureCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = "1px solid #3b82f6";
              e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = "1px solid #1e293b";
              e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.3)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={styles.featureIcon}>✅</div>
            <div style={styles.featureTitle}>Quality Assurance</div>
            <div style={styles.featureDesc}>Automated testing and SonarQube integration included</div>
          </div>
        </div>

        <div style={styles.versionInfo}>Latest Version: 1.0.0</div>

        {/* CTA Buttons */}
        <div style={styles.ctaContainer}>
          <button
            style={styles.primaryBtn}
            onClick={onStart}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2563eb";
              e.currentTarget.style.boxShadow = "0 12px 24px rgba(59, 130, 246, 0.5)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#3b82f6";
              e.currentTarget.style.boxShadow = "0 8px 16px rgba(59, 130, 246, 0.4)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Start Migration →
          </button>
          <button
            style={styles.secondaryBtn}
            onClick={() => {
              window.location.href = GITHUB_AUTH_LOGIN_URL;
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Login with GitHub
          </button>
          <button
            style={styles.secondaryBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            About this product
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function LandingPage({ onStart }: { onStart: () => void }) {
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 48%, #f1f5f9 100%)",
      color: "#1e293b",
      display: "flex",
      flexDirection: "column",
      width: "100%",
      overflow: "hidden",
    },
    hero: {
      flex: 1,
      display: "grid",
      gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
      gap: 40,
      alignItems: "center",
      padding: "72px 32px",
      maxWidth: 1180,
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box",
    },
    eyebrow: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 999,
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      color: "#2563eb",
      fontSize: 13,
      fontWeight: 800,
      marginBottom: 18,
    },
    headline: {
      fontSize: 52,
      fontWeight: 900,
      marginBottom: 18,
      letterSpacing: 0,
      lineHeight: 1.04,
      color: "#0f172a",
    },
    highlightedText: {
      color: "#2563eb",
    },
    description: {
      fontSize: 17,
      color: "#475569",
      lineHeight: 1.75,
      maxWidth: 680,
      marginBottom: 28,
      fontWeight: 500,
    },
    ctaContainer: {
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 34,
    },
    primaryBtn: {
      backgroundColor: "#2563eb",
      color: "#fff",
      padding: "13px 22px",
      borderRadius: 8,
      border: "none",
      fontWeight: 800,
      fontSize: 14,
      cursor: "pointer",
      transition: "all 0.2s ease",
      boxShadow: "0 12px 24px rgba(37,99,235,0.24)",
      display: "inline-flex",
      alignItems: "center",
      gap: 9,
    },
    secondaryBtn: {
      backgroundColor: "#fff",
      color: "#2563eb",
      padding: "13px 22px",
      borderRadius: 8,
      border: "1px solid #bfdbfe",
      fontWeight: 800,
      fontSize: 14,
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "inline-flex",
      alignItems: "center",
      gap: 9,
    },
    proofRow: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      color: "#64748b",
      fontSize: 13,
      fontWeight: 700,
    },
    proofPill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "8px 10px",
      borderRadius: 999,
      background: "#fff",
      border: "1px solid #e2e8f0",
    },
    panel: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      boxShadow: "0 22px 54px rgba(15,23,42,0.1)",
      padding: 24,
    },
    panelHeader: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      paddingBottom: 18,
      marginBottom: 18,
      borderBottom: "1px solid #e2e8f0",
    },
    panelLogo: {
      width: 46,
      height: 46,
      borderRadius: 10,
      border: "1px solid #e2e8f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8fafc",
    },
    features: {
      display: "grid",
      gap: 12,
    },
    featureCard: {
      padding: 16,
      borderRadius: 8,
      border: "1px solid #e2e8f0",
      backgroundColor: "#fff",
      display: "flex",
      gap: 13,
      alignItems: "flex-start",
    },
    featureIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: "#eff6ff",
      color: "#2563eb",
      border: "1px solid #bfdbfe",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto",
    },
    featureTitle: {
      fontSize: 15,
      fontWeight: 800,
      marginBottom: 4,
      color: "#1e293b",
    },
    featureDesc: {
      fontSize: 13,
      color: "#64748b",
      lineHeight: 1.55,
    },
  };

  const features = [
    { icon: <FiZap />, title: "Fast Migration", desc: "Automated refactoring and code transformation in minutes." },
    { icon: <FiSearch />, title: "Deep Analysis", desc: "Dependency, framework, build tool, and Java version discovery." },
    { icon: <FiShield />, title: "Quality Assurance", desc: "Testing, security checks, and review-ready migration output." },
  ];

  return (
    <div style={styles.container}>
      <Header />

      <main style={styles.hero}>
        <section>
          <div style={styles.eyebrow}>
            <FiCheckCircle />
            Java modernization platform
          </div>
          <h1 style={styles.headline}>
            Modernize Java apps with <span style={styles.highlightedText}>confidence</span>.
          </h1>
          <p style={styles.description}>
            JavaApex helps teams analyze repositories, plan migrations, run automated refactors, and review the result in one guided product workflow.
          </p>

          <div style={styles.ctaContainer}>
            <button style={styles.primaryBtn} onClick={onStart}>
              Start Migration
              <FiArrowRight />
            </button>
            <button
              style={styles.secondaryBtn}
              onClick={() => {
                window.location.href = GITHUB_AUTH_LOGIN_URL;
              }}
            >
              <FiGithub />
              Connect GitHub
            </button>
          </div>

          <div style={styles.proofRow}>
            <span style={styles.proofPill}>Java 8 to latest</span>
            <span style={styles.proofPill}>OpenRewrite ready</span>
            <span style={styles.proofPill}>Report included</span>
          </div>
        </section>

        <aside style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelLogo}>
              <img src={apexLogo} alt="javaAPEX" style={{ width: 32, height: 32, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#1e293b" }}>Migration Command Center</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>Analyze, plan, migrate, and report</div>
            </div>
          </div>

          <div style={styles.features}>
            {features.map((feature) => (
              <div key={feature.title} style={styles.featureCard}>
                <div style={styles.featureIcon}>{feature.icon}</div>
                <div>
                  <div style={styles.featureTitle}>{feature.title}</div>
                  <div style={styles.featureDesc}>{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}
