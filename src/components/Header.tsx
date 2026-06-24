import React, { useEffect, useState } from "react";
import apexLogo from "../assets/apexlogo.png";

interface HeaderProps {
  showBackButton?: boolean;
  onBackToHome?: () => void;
}

export default function Header({ showBackButton = false, onBackToHome }: HeaderProps) {
  const styles: { [key: string]: React.CSSProperties } = {
    navbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 40px",
      borderBottom: "1px solid var(--nav-border)",
      backgroundColor: "var(--nav-bg)",
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
      color: "var(--primary)",
      margin: 0,
    },
    navLinks: {
      display: "flex",
      gap: 20,
      alignItems: "center",
    },
    navLink: {
      color: "var(--muted)",
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
      color: "var(--text)",
      border: "1px solid var(--icon-border)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 14,
      transition: "all 0.3s ease",
    },
    backButton: {
      backgroundColor: "var(--surface)",
      color: "var(--text)",
      border: "1.5px solid var(--border)",
      borderRadius: 8,
      padding: "8px 16px",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      transition: "all 0.3s ease",
    },
  };

  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem("theme") || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch (e) {
      return 'light';
    }
  });

  useEffect(() => {
    const cls = theme === 'dark' ? 'theme-dark' : '';
    if (cls) document.documentElement.classList.add(cls);
    else document.documentElement.classList.remove('theme-dark');
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <nav style={styles.navbar}>
      {/* Logo Only - No Text */}
      <div style={styles.logoContainer} onClick={onBackToHome}>
        <img src={apexLogo} alt="javaAPEX" style={{ width: 36, height: 36, objectFit: 'contain' }} />
        <p style={styles.logoText}>javaAPEX</p>
      </div>

      {/* Navigation Links */}
      <div style={styles.navLinks}>
        <a style={styles.navLink} className="header-nav-link" href="#">Documentation</a>
        <a style={styles.navLink} className="header-nav-link" href="https://github.com/sorimdevs-tech/java-migration-accelerator" target="_blank" rel="noreferrer">GitHub</a>
        <a style={styles.navLink} className="header-nav-link" href="#">Support Us</a>
        
        {showBackButton && onBackToHome ? (
          <button
            style={styles.backButton}
            className="header-back-button"
            onClick={onBackToHome}
          >
            ← Home
          </button>
        ) : null}
        
        {/* Profile Icon */}
        {/* Theme Toggle */}
        <button
          style={{ ...styles.iconButton, marginRight: 8 }}
          className="header-theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>

        <button
          style={styles.iconButton}
          className="header-profile-button"
          title="Profile"
        >
          👤
        </button>
      </div>
    </nav>
  );
}
