import React from "react";
import { FiArrowLeft, FiBookOpen, FiGithub, FiHeadphones, FiUser } from "react-icons/fi";
import apexLogo from "../assets/apexlogo.png";

interface HeaderProps {
  showBackButton?: boolean;
  onBackToHome?: () => void;
}

function LegacyHeader({ showBackButton = false, onBackToHome }: HeaderProps) {
  const styles: { [key: string]: React.CSSProperties } = {
    navbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 40px",
      borderBottom: "1px solid #1e293b",
      backgroundColor: "rgba(15, 20, 25, 0.95)",
      backdropFilter: "blur(10px)",
      position: "relative",
    },
    logoContainer: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
    },
    logoText: {
      fontSize: 16,
      fontWeight: 700,
      color: "#3b82f6",
      margin: 0,
    },
    navLinks: {
      display: "flex",
      gap: 20,
      alignItems: "center",
    },
    navLink: {
      color: "#e2e8f0",
      textDecoration: "none",
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer",
      transition: "color 0.3s ease",
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: "50%",
      backgroundColor: "transparent",
      color: "#e2e8f0",
      border: "1px solid #374151",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 14,
      transition: "all 0.3s ease",
    },
    backButton: {
      backgroundColor: "#f1f5f9",
      color: "#1e293b",
      border: "1.5px solid #cbd5e1",
      borderRadius: 8,
      padding: "8px 16px",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      transition: "all 0.3s ease",
    },
  };

  return (
    <nav style={styles.navbar}>
      {/* Logo Only - No Text */}
      <div style={styles.logoContainer} onClick={onBackToHome}>
        <img src={apexLogo} alt="javaAPEX" style={{ width: 36, height: 36, objectFit: 'contain' }} />
        <p style={styles.logoText}>javaAPEX</p>
      </div>

      {/* Navigation Links */}
      <div style={styles.navLinks}>
        <a
          style={styles.navLink}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#3b82f6")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#e2e8f0")}
          href="#"
        >
          Documentation
        </a>
        <a
          style={styles.navLink}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#3b82f6")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#e2e8f0")}
          href="https://github.com/sorimdevs-tech/java-migration-accelerator"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <a
          style={styles.navLink}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#3b82f6")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#e2e8f0")}
          href="#"
        >
          Support Us
        </a>
        
        {showBackButton && onBackToHome ? (
          <button
            style={styles.backButton}
            onClick={onBackToHome}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#e2e8f0";
              e.currentTarget.style.borderColor = "#64748b";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f1f5f9";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }}
          >
            ← Home
          </button>
        ) : null}
        
        {/* Profile Icon */}
        <button
          style={styles.iconButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#3b82f6";
            e.currentTarget.style.borderColor = "#3b82f6";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "#374151";
            e.currentTarget.style.color = "#e2e8f0";
          }}
          title="Profile"
        >
          👤
        </button>
      </div>
    </nav>
  );
}

export default function Header({ showBackButton = false, onBackToHome }: HeaderProps) {
  const styles: { [key: string]: React.CSSProperties } = {
    navbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 20,
      padding: "14px 32px",
      borderBottom: "1px solid #e2e8f0",
      backgroundColor: "rgba(255,255,255,0.96)",
      backdropFilter: "blur(14px)",
      position: "sticky",
      top: 0,
      zIndex: 20,
      boxShadow: "0 8px 28px rgba(15,23,42,0.04)",
    },
    logoContainer: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      cursor: "pointer",
    },
    logoMark: {
      width: 42,
      height: 42,
      borderRadius: 10,
      background: "#fff",
      border: "1px solid #e2e8f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
    },
    logoText: {
      fontSize: 18,
      fontWeight: 800,
      color: "#1e293b",
      margin: 0,
      lineHeight: 1,
    },
    logoSubtext: {
      fontSize: 12,
      fontWeight: 600,
      color: "#64748b",
      marginTop: 4,
    },
    navLinks: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexWrap: "wrap",
      justifyContent: "flex-end",
    },
    navLink: {
      color: "#475569",
      textDecoration: "none",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: 7,
      padding: "9px 13px",
      borderRadius: 8,
      border: "1px solid transparent",
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: "#fff",
      color: "#64748b",
      border: "1px solid #e2e8f0",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 16,
      transition: "all 0.2s ease",
      boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
    },
    backButton: {
      backgroundColor: "#eff6ff",
      color: "#2563eb",
      border: "1px solid #bfdbfe",
      borderRadius: 8,
      padding: "9px 14px",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 13,
      transition: "all 0.2s ease",
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
    },
  };

  const navHover = (element: HTMLElement, active: boolean) => {
    element.style.background = active ? "#eff6ff" : "transparent";
    element.style.borderColor = active ? "#bfdbfe" : "transparent";
    element.style.color = active ? "#2563eb" : "#475569";
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.logoContainer} onClick={onBackToHome}>
        <div style={styles.logoMark}>
          <img src={apexLogo} alt="javaAPEX" style={{ width: 30, height: 30, objectFit: "contain" }} />
        </div>
        <div>
          <p style={styles.logoText}>javaAPEX</p>
          <div style={styles.logoSubtext}>Migration Platform</div>
        </div>
      </div>

      <div style={styles.navLinks}>
        <a style={styles.navLink} onMouseEnter={(e) => navHover(e.currentTarget, true)} onMouseLeave={(e) => navHover(e.currentTarget, false)} href="#">
          <FiBookOpen />
          Docs
        </a>
        <a style={styles.navLink} onMouseEnter={(e) => navHover(e.currentTarget, true)} onMouseLeave={(e) => navHover(e.currentTarget, false)} href="https://github.com/sorimdevs-tech/java-migration-accelerator" target="_blank" rel="noreferrer">
          <FiGithub />
          GitHub
        </a>
        <a style={styles.navLink} onMouseEnter={(e) => navHover(e.currentTarget, true)} onMouseLeave={(e) => navHover(e.currentTarget, false)} href="#">
          <FiHeadphones />
          Support
        </a>

        {showBackButton && onBackToHome ? (
          <button style={styles.backButton} onClick={onBackToHome}>
            <FiArrowLeft />
            Home
          </button>
        ) : null}

        <button style={styles.iconButton} title="Profile">
          <FiUser />
        </button>
      </div>
    </nav>
  );
}
