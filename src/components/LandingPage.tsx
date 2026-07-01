import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import { GITHUB_AUTH_LOGIN_URL } from "../services/api";

export default function LandingPage({ onStart }: { onStart: () => void }) {
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      minHeight: "100vh",
      background: "radial-gradient(circle at top left, rgba(196, 181, 253, 0.38), transparent 30%), linear-gradient(135deg, #faf7ff 0%, #f2ebff 45%, #e9ddff 100%)",
      color: "#f6f5f8",
      display: "flex",
      flexDirection: "column",
      width: "100vw",
      marginLeft: "calc(-50vw + 50%)",
      overflow: "hidden",
    },
    hero: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      padding: "72px 24px 64px",
      maxWidth: 1240,
      margin: "0 auto",
      width: "100%",
    },
    heroPanel: {
      width: "100%",
      borderRadius: 24,
      padding: "44px 32px",
      background: "rgba(255, 255, 255, 0.72)",
      border: "1px solid rgba(148, 163, 184, 0.22)",
      boxShadow: "0 20px 60px rgba(148, 163, 184, 0.18)",
      backdropFilter: "blur(18px)",
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 14px",
      borderRadius: 999,
      backgroundColor: "rgba(59, 130, 246, 0.12)",
      color: "#1d4ed8",
      fontSize: 13,
      fontWeight: 700,
      marginBottom: 20,
      border: "1px solid rgba(96, 165, 250, 0.24)",
    },
    headline: {
      fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)",
      fontWeight: 800,
      marginBottom: 16,
      letterSpacing: "-0.03em",
      color: "#0f172a",
      lineHeight: 1.1,
    },
    highlightedText: {
      fontSize: "clamp(2rem, 4.4vw, 3.5rem)",
      fontWeight: 800,
      background: "linear-gradient(135deg, #60a5fa 0%, #38bdf8 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      marginBottom: 20,
      lineHeight: 1.1,
    },
    description: {
      fontSize: 18,
      color: "#475569",
      lineHeight: 1.8,
      maxWidth: 760,
      margin: "0 auto 32px",
      fontWeight: 500,
    },
    ctaContainer: {
      display: "flex",
      flexWrap: "wrap",
      gap: 16,
      justifyContent: "center",
      marginBottom: 36,
    },
    primaryBtn: {
      background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
      color: "#fff",
      padding: "14px 28px",
      borderRadius: 999,
      border: "none",
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer",
      transition: "all 0.3s ease",
      boxShadow: "0 12px 24px rgba(37, 99, 235, 0.28)",
    },
    secondaryBtn: {
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      color: "#1d4ed8",
      padding: "14px 24px",
      borderRadius: 999,
      border: "1px solid rgba(148, 163, 184, 0.28)",
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    stats: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 16,
      width: "100%",
      marginTop: 12,
    },
    statCard: {
      padding: 18,
      borderRadius: 16,
      border: "1px solid rgba(148, 163, 184, 0.18)",
      backgroundColor: "rgba(248, 250, 252, 0.82)",
      textAlign: "left",
      transition: "all 0.3s ease",
    },
    statTitle: {
      fontSize: 13,
      textTransform: "uppercase",
      letterSpacing: "0.16em",
      color: "#2563eb",
      marginBottom: 6,
      fontWeight: 700,
    },
    statValue: {
      fontSize: 20,
      fontWeight: 700,
      color: "#0f172a",
    },
    footer: {
      borderTop: "1px solid rgba(148, 163, 184, 0.16)",
      padding: "32px 24px",
      textAlign: "center",
      backgroundColor: "rgba(248, 250, 252, 0.9)",
      fontSize: 14,
      color: "#64748b",
    },
  };

  return (
    <div style={styles.container}>
      <Header />

      <div style={styles.hero}>
        <div style={styles.heroPanel}>
          <div style={styles.badge}>⚡ AI-powered Java modernization</div>
          <h1 style={styles.headline}>Modernize Your</h1>
          <div style={styles.highlightedText}>Java Applications</div>

          <p style={styles.description}>
            Accelerate your Java migration journey with automated refactoring, deep compatibility analysis,
            and reliable upgrade planning tailored for modern enterprise systems.
          </p>

          <div style={styles.ctaContainer}>
            <button
              style={styles.primaryBtn}
              onClick={onStart}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 16px 32px rgba(37, 99, 235, 0.32)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(37, 99, 235, 0.28)";
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
                e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Login with GitHub
            </button>
            <button
              style={styles.secondaryBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              About this product
            </button>
          </div>

          <div style={styles.stats}>
            <div style={styles.statCard}>
              <div style={styles.statTitle}>Migration Speed</div>
              <div style={styles.statValue}>Up to 70% faster</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statTitle}>Compatibility Coverage</div>
              <div style={styles.statValue}>Java 7 → 21 ready</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statTitle}>Quality Checks</div>
              <div style={styles.statValue}>SonarQube + testing</div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
