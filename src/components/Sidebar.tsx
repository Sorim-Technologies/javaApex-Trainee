import React from "react";
import { FiBarChart2, FiCreditCard, FiHelpCircle, FiSettings, FiUsers, FiZap } from "react-icons/fi";
import "../App.css";

const sidebarStyles: { [key: string]: React.CSSProperties } = {
  aside: {
    width: 220,
    background: '#fff',
    borderRight: '1px solid #e0e0e0',
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
    color: '#2563eb',
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
    color: '#334155',
    cursor: 'pointer',
    borderLeft: '3px solid transparent',
    transition: 'background 0.2s, border-color 0.2s',
  },
  active: {
    background: '#e3f2fd',
    color: '#2563eb',
    borderLeft: '3px solid #2563eb',
    fontWeight: 600,
  },
};

const LegacySidebar: React.FC = () => (
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

const professionalSidebarStyles: { [key: string]: React.CSSProperties } = {
  aside: {
    width: 248,
    background: "#fff",
    borderRight: "1px solid #e2e8f0",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    padding: "24px 14px",
    boxShadow: "8px 0 28px rgba(15,23,42,0.04)",
  },
  header: {
    fontWeight: 800,
    fontSize: 15,
    color: "#1e293b",
    marginBottom: 18,
    padding: "0 12px",
  },
  nav: {
    width: "100%",
  },
  ul: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  li: {
    padding: "11px 12px",
    fontSize: 14,
    color: "#475569",
    cursor: "pointer",
    borderRadius: 8,
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 650,
  },
  active: {
    background: "#eff6ff",
    color: "#2563eb",
    boxShadow: "inset 0 0 0 1px #bfdbfe",
  },
};

const navItems = [
  { label: "Migration Plans", icon: <FiZap />, active: true },
  { label: "Report Summary", icon: <FiBarChart2 /> },
  { label: "Admin Tools", icon: <FiSettings /> },
  { label: "Team Access", icon: <FiUsers /> },
  { label: "Billing", icon: <FiCreditCard /> },
  { label: "Support", icon: <FiHelpCircle /> },
];

const Sidebar: React.FC = () => (
  <aside style={professionalSidebarStyles.aside}>
    <div style={professionalSidebarStyles.header}>Workspace</div>
    <nav style={professionalSidebarStyles.nav}>
      <ul style={professionalSidebarStyles.ul}>
        {navItems.map((item) => (
          <li key={item.label} style={{ ...professionalSidebarStyles.li, ...(item.active ? professionalSidebarStyles.active : {}) }}>
            {item.icon}
            {item.label}
          </li>
        ))}
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
