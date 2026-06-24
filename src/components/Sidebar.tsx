import React from "react";
import "../App.css";

const sidebarStyles: { [key: string]: React.CSSProperties } = {
  aside: {
    width: 220,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '32px 0 0 0',
    boxShadow: '0 0 8px rgba(0,0,0,0.02)',
  },
  header: {
    fontWeight: 700,
    fontSize: 18,
    color: 'var(--primary)',
    marginBottom: 24,
    paddingLeft: 32,
    letterSpacing: '-0.01em',
  },
  nav: {
    width: '100%',
  },
  ul: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    width: '100%',
  },
  li: {
    padding: '12px 32px',
    fontSize: 15,
    color: 'var(--text)',
    cursor: 'pointer',
    borderLeft: '3px solid transparent',
    transition: 'background 0.2s, border-color 0.2s',
  },
  active: {
    background: 'var(--info-bg)',
    color: 'var(--info-text)',
    borderLeft: '3px solid var(--primary)',
    fontWeight: 600,
  },
};

const Sidebar: React.FC = () => (
  <aside style={sidebarStyles.aside}>
    <div style={sidebarStyles.header}>Java Migration</div>
    <nav style={sidebarStyles.nav}>
      <ul style={sidebarStyles.ul}>
        <li style={{ ...sidebarStyles.li, ...sidebarStyles.active }}>🚀 Migration Plans</li>
        <li style={sidebarStyles.li}>📊 Report Summary</li>
        <li style={sidebarStyles.li}>⚙️ Admin Tools</li>
        <li style={sidebarStyles.li}>👥 Multi User</li>
        <li style={sidebarStyles.li}>💰 Pricing</li>
        <li style={sidebarStyles.li}>🆘 Support</li>
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
