import React from "react";
import "../App.css";

const iconStyle: React.CSSProperties = { width: 18, height: 18, flexShrink: 0 };

const icons = {
  migration: (
    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h8l-1 8 11-13h-8l1-7Z" />
    </svg>
  ),
  report: (
    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="m7 14 3-3 3 2 5-6" />
    </svg>
  ),
  tools: (
    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-3-3 2.4-2.4Z" />
    </svg>
  ),
  users: (
    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  pricing: (
    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 1 1 0-4h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  support: (
    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a8 8 0 0 0-8 8v3a3 3 0 0 0 3 3h1v-6H6a6 6 0 0 1 12 0h-2v6h1a3 3 0 0 0 3-3v-3a8 8 0 0 0-8-8Z" /><path d="M12 20h3" />
    </svg>
  ),
};

const sidebarStyles: { [key: string]: React.CSSProperties } = {
  aside: {
    width: 260,
    background: "var(--bg-secondary)",
    borderRight: "1px solid var(--border-color)",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    boxShadow: "var(--shadow-soft)",
    color: "var(--text-primary)",
  },
  header: {
    fontWeight: 800,
    fontSize: 16,
    color: "var(--text-primary)",
    marginBottom: 18,
    padding: "0 10px",
    letterSpacing: 0,
  },
  nav: { width: "100%" },
  ul: { listStyle: "none", padding: 0, margin: 0, width: "100%", display: "flex", flexDirection: "column", gap: 8 },
  li: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 650,
    color: "var(--text-secondary)",
    cursor: "pointer",
    border: "1px solid var(--border-light)",
    borderRadius: 8,
    background: "var(--bg-card)",
    transition: "all 0.2s ease",
  },
  active: {
    background: "var(--accent-light)",
    color: "var(--accent)",
    border: "1px solid var(--border-hover)",
    boxShadow: "var(--shadow-soft)",
  },
};

const navItems = [
  ["migration", "Migration Plans"],
  ["report", "Report Summary"],
  ["tools", "Admin Tools"],
  ["users", "Multi User"],
  ["pricing", "Pricing"],
  ["support", "Support"],
] as const;

const Sidebar: React.FC = () => (
  <aside style={sidebarStyles.aside}>
    <div style={sidebarStyles.header}>Java Migration</div>
    <nav style={sidebarStyles.nav}>
      <ul style={sidebarStyles.ul}>
        {navItems.map(([key, label], index) => (
          <li
            key={key}
            className="hoverable-box"
            style={{ ...sidebarStyles.li, ...(index === 0 ? sidebarStyles.active : {}) }}
          >
            {icons[key]}
            {label}
          </li>
        ))}
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
