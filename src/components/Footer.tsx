import React from "react";

export default function Footer() {
  const styles: { [key: string]: React.CSSProperties } = {
    footer: {
      position: "fixed",
      left: 0,
      bottom: 0,
      width: "100%",
      zIndex: 9999,
      borderTop: "1px solid var(--footer-border)",
      padding: "18px 24px",
      textAlign: "center",
      backgroundColor: "var(--footer-bg)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      fontSize: 14,
      color: "var(--muted)",
    },
    copyright: {
      marginBottom: 12,
    },
    poweredBy: {
      fontSize: 13,
      color: "var(--muted)",
      marginTop: 12,
    },
    sorimai: {
      color: "var(--primary)",
      fontWeight: 700,
    },
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.copyright}>© 2026 javaAPEX. All rights reserved.</div>
      <div style={styles.poweredBy}>
        Powered by <span style={styles.sorimai}>Sorim.ai</span>
      </div>
    </footer>
  );
}
