import React from "react";
import "../App.css";

const topBarStyles: { [key: string]: React.CSSProperties } = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 2rem',
    background: 'var(--nav-bg)',
    borderBottom: '1px solid var(--nav-border)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
    minHeight: 56,
  },
  brand: {
    fontWeight: 700,
    fontSize: '1.15rem',
    color: 'var(--primary)',
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
    color: 'var(--text)',
  },
  badge: {
    background: 'var(--info-bg)',
    padding: '6px 12px',
    borderRadius: '16px',
    color: 'var(--info-text)',
    fontWeight: 500,
    fontSize: '0.95rem',
  },
  online: {
    background: 'var(--success-bg)',
    padding: '6px 12px',
    borderRadius: '16px',
    color: 'var(--success-text)',
    fontWeight: 500,
    fontSize: '0.95rem',
  },
  user: {
    fontWeight: 700,
    color: 'var(--text)',
    fontSize: '0.95rem',
  },
};

const TopBar: React.FC = () => (
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

export default TopBar;
