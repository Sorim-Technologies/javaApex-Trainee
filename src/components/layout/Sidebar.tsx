import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Layout.css";

type SidebarItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  route?: string;
  action?: () => void;
  tooltip: string;
  active?: boolean;
};

type SidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
  isAuthenticated: boolean;
  onLogout: () => void;
  navigateToTheme: () => void;
  onOpenSettings: () => void;
  onProfileToggle: () => void;
  isThemeOpen: boolean;
  isProfileOpen: boolean;
};

export default function Sidebar({
  isCollapsed,
  onToggle,
  isAuthenticated,
  onLogout,
  navigateToTheme,
  onOpenSettings,
  onProfileToggle,
  isThemeOpen,
  isProfileOpen,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const migrationRoutes = new Set([
    "/",
    "/connect",
    "/discovery",
    "/strategy",
    "/migration",
    "/report",
  ]);

  const isDashboardActive = location.pathname === "/dashboard";
  const isMigrationActive =
    migrationRoutes.has(location.pathname) &&
    !isThemeOpen &&
    !isProfileOpen;

  const items: SidebarItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <span className="sidebar__icon">🏠</span>,
      route: "/dashboard",
      tooltip: "Go to dashboard",
      active: isDashboardActive,
    },
    {
      key: "migration",
      label: "Migration",
      icon: <span className="sidebar__icon">🚀</span>,
      route: "/",
      tooltip: "Open migration workflow",
      active: isMigrationActive,
    },
    {
      key: "themes",
      label: "Themes",
      icon: <span className="sidebar__icon">🎨</span>,
      action: navigateToTheme,
      tooltip: "Open theme selector",
      active: isThemeOpen,
    },
    {
      key: "settings",
      label: "Settings",
      icon: <span className="sidebar__icon">⚙️</span>,
      action: onOpenSettings,
      tooltip: "Open settings",
      active: false,
    },
    {
      key: "profile",
      label: isAuthenticated ? "Profile" : "Login",
      icon: <span className="sidebar__icon">👤</span>,
      action: onProfileToggle,
      tooltip: isAuthenticated ? "View profile" : "Login",
      active: isProfileOpen,
    },
    {
      key: "logout",
      label: "Logout",
      icon: <span className="sidebar__icon">🚪</span>,
      action: onLogout,
      tooltip: "Logout",
      active: false,
    },
  ];

  const handleItemClick = (item: SidebarItem) => {
    if (item.action) {
      item.action();
      return;
    }

    if (item.route && location.pathname !== item.route) {
      navigate(item.route);
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar__inner">
        <button
          type="button"
          className="sidebar__toggle"
          onClick={onToggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="sidebar__toggle-icon">☰</span>
          {!isCollapsed && <span className="sidebar__toggle-label">Menu</span>}
        </button>

        <nav className="sidebar__nav" aria-label="Sidebar navigation">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sidebar__item${item.active ? " sidebar__item--active" : ""}`}
              onClick={() => handleItemClick(item)}
              aria-current={item.active ? "page" : undefined}
              title={isCollapsed ? item.tooltip : undefined}
            >
              <span className="sidebar__item-icon">{item.icon}</span>
              {!isCollapsed && (
                <span className="sidebar__item-label">{item.label}</span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
