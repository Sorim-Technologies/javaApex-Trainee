import React from "react";

export default function Footer() {
  const styles: { [key: string]: React.CSSProperties } = {
    footer: {
      borderTop: "1px solid #e2e8f0",
      padding: "18px 32px",
      backgroundColor: "rgba(255,255,255,0.92)",
      fontSize: 13,
      color: "#64748b",
    },
    inner: {
      maxWidth: 1180,
      margin: "0 auto",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap",
    },
    copyright: {
      fontWeight: 600,
    },
    poweredBy: {
      color: "#64748b",
    },
    sorimai: {
      color: "#2563eb",
      fontWeight: 800,
    },
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.inner}>
      <div style={styles.copyright}>
        Copyright {new Date().getFullYear()} javaAPEX. All rights reserved.
      </div>
      <div style={{ ...styles.copyright, display: "none" }}>
        © {new Date().getFullYear()} javaAPEX. All rights reserved.
      </div>
      <div style={styles.poweredBy}>
        Powered by <span style={styles.sorimai}>Sorim.ai</span>
      </div>
      </div>
    </footer>
  );
}
