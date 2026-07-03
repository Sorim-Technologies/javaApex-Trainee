import React from "react";
import { FiBell, FiCheckCircle, FiRefreshCw, FiUser } from "react-icons/fi";
import "../../App.css";

const topBarStyles: { [key: string]: React.CSSProperties } = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 2rem',
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
    minHeight: 56,
  },
  brand: {
    fontWeight: 700,
    fontSize: '1.15rem',
    color: '#2563eb',
    letterSpacing: '-0.01em',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.2rem',
    fontSize: '0.95rem',
  },
  badge: {
    background: '#e3f2fd',
    padding: '6px 12px',
    borderRadius: '16px',
    color: '#2563eb',
    fontWeight: 500,
    fontSize: '0.95rem',
  },
  online: {
    background: '#e8f5e9',
    padding: '6px 12px',
    borderRadius: '16px',
    color: '#2e7d32',
    fontWeight: 500,
    fontSize: '0.95rem',
  },
  user: {
    fontWeight: 700,
    color: '#333',
    fontSize: '0.95rem',
  },
};

const LegacyTopBar: React.FC = () => (
  <header style={topBarStyles.header}>
    <div style={topBarStyles.brand}>
      <span style={{ fontSize: 22 }}>☕</span>
    </div>
    <div style={topBarStyles.status}>
      <span style={topBarStyles.badge}>🔄 OpenRewrite Powered</span>
      <span>📧 Notifications</span>
      <span style={topBarStyles.online}>✅ API Online</span>
      <span style={topBarStyles.user}>👤 Developer</span>
    </div>
  </header>
);

const professionalTopBarStyles: { [key: string]: React.CSSProperties } = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "14px 28px",
    background: "rgba(255,255,255,0.96)",
    borderBottom: "1px solid #e2e8f0",
    boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
    minHeight: 60,
  },
  brand: {
    fontWeight: 800,
    fontSize: "1rem",
    color: "#1e293b",
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: "0.9rem",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  badge: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "7px 11px",
    borderRadius: 999,
    color: "#2563eb",
    fontWeight: 700,
    fontSize: "0.82rem",
  },
  online: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    padding: "7px 11px",
    borderRadius: 999,
    color: "#16a34a",
    fontWeight: 700,
    fontSize: "0.82rem",
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#64748b",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
  },
};

const TopBar: React.FC = () => (
  <header style={professionalTopBarStyles.header}>
    <div style={professionalTopBarStyles.brand}>javaAPEX Platform</div>
    <div style={professionalTopBarStyles.status}>
      <span style={professionalTopBarStyles.badge}>🔄 OpenRewrite Powered</span>
      <span style={professionalTopBarStyles.online}>
        <FiCheckCircle />
        API Connected
      </span>
      <button style={professionalTopBarStyles.iconBtn} title="Notifications">
        <FiBell />
      </button>
      <button style={professionalTopBarStyles.iconBtn} title="User Developer">
        <FiUser />
      </button>
    </div>
  </header>
);

export default TopBar;
