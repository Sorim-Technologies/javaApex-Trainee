import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WIZARD_FORM_STATE_KEY, WIZARD_SELECTED_REPO_KEY, WIZARD_REPO_ANALYSIS_KEY } from "../wizard/model/wizardConfig";
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

type WorkflowStep = {
  key: string;
  label: string;
  route: string;
  step: number;
};

type SidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
  isAuthenticated: boolean;
  onLogout: () => void;
  navigateToTheme: () => void;
  onProfileToggle: () => void;
  isThemeOpen: boolean;
  isProfileOpen: boolean;
};

const workflowSteps: WorkflowStep[] = [
  { key: "connect", label: "Connect", route: "/", step: 1 },
  { key: "discovery", label: "Discovery", route: "/discovery", step: 2 },
  { key: "strategy", label: "Strategy", route: "/strategy", step: 3 },
  { key: "migration", label: "Migration", route: "/migration", step: 4 },
  { key: "results", label: "Results", route: "/report", step: 5 },
];

const readMaxVisitedWorkflowStep = () => {
  if (typeof window === "undefined") return 1;

  try {
    // Ensure a repository is selected and analyzed before unlocking steps beyond Connect
    const selectedRepoRaw = window.sessionStorage.getItem(WIZARD_SELECTED_REPO_KEY) || window.localStorage.getItem(WIZARD_SELECTED_REPO_KEY);
    const repoAnalysisRaw = window.sessionStorage.getItem(WIZARD_REPO_ANALYSIS_KEY) || window.localStorage.getItem(WIZARD_REPO_ANALYSIS_KEY);

    // If no validated repo, lock to step 1 (Connect)
    if (!selectedRepoRaw || !repoAnalysisRaw) return 1;

    const savedState = window.sessionStorage.getItem(WIZARD_FORM_STATE_KEY) || window.localStorage.getItem(WIZARD_FORM_STATE_KEY);
    if (!savedState) return 2; // allow at least Connect->Discovery if analysis exists (conservative)

    const parsedState = JSON.parse(savedState) as { maxVisitedIndicatorStep?: unknown };
    const parsedStep = Number(parsedState.maxVisitedIndicatorStep);
    return Number.isFinite(parsedStep) ? Math.max(1, Math.min(5, parsedStep)) : 1;
  } catch {
    return 1;
  }
};

export default function Sidebar({
  isCollapsed,
  onToggle,
  isAuthenticated,
  onLogout,
  navigateToTheme,
  onProfileToggle,
  isThemeOpen,
  isProfileOpen,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const migrationRoutes = new Set([
    "/",
    "/connect",
    "/discovery",
    "/strategy",
    "/migration",
    "/migrating",
    "/progress",
  ]);

  const isDashboardActive = normalizedPath === "/dashboard";
  const isReportsActive = normalizedPath === "/report";
  const isMigrationActive =
    migrationRoutes.has(normalizedPath) &&
    !isThemeOpen &&
    !isProfileOpen;

  const getWorkflowStepFromPath = () => {
    if (normalizedPath === "/" || normalizedPath === "/connect") return 1;
    if (normalizedPath === "/discovery") return 2;
    if (normalizedPath === "/strategy") return 3;
    if (normalizedPath === "/migration" || normalizedPath === "/migrating" || normalizedPath === "/progress") return 4;
    if (normalizedPath === "/report") return 5;
    return 0;
  };

  const currentWorkflowStep = getWorkflowStepFromPath();
  const maxVisitedWorkflowStep = Math.max(readMaxVisitedWorkflowStep(), currentWorkflowStep || 1);
  const isVisuallyExpanded = !isCollapsed || isHoverExpanded;

  const clearCollapseTimer = () => {
    if (collapseTimer.current) {
      window.clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  };

  const handleSidebarEnter = () => {
    clearCollapseTimer();
    setIsHoverExpanded(true);
  };

  const handleSidebarLeave = () => {
    clearCollapseTimer();
    collapseTimer.current = window.setTimeout(() => {
      setIsHoverExpanded(false);
      collapseTimer.current = null;
    }, 260);
  };

  useEffect(() => clearCollapseTimer, []);

  const primaryItems: SidebarItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <span className="sidebar__icon">{"\u2302"}</span>,
      route: "/dashboard",
      tooltip: "Go to dashboard",
      active: isDashboardActive,
    },
    {
      key: "migration",
      label: "Migration",
      icon: <span className="sidebar__icon">{"\u2197"}</span>,
      route: "/",
      tooltip: "Open migration workflow",
      active: isMigrationActive,
    },
    {
      key: "reports",
      label: "Reports",
      icon: <span className="sidebar__icon">{"\u25a4"}</span>,
      route: "/report",
      tooltip: "View migration reports",
      active: isReportsActive,
    },
  ];

  const utilityItems: SidebarItem[] = [
    {
      key: "themes",
      label: "Themes",
      icon: <span className="sidebar__icon">{"\u25d0"}</span>,
      action: navigateToTheme,
      tooltip: "Open theme selector",
      active: isThemeOpen,
    },
    {
      key: "settings",
      label: "Settings",
      icon: <span className="sidebar__icon">{"\u2699"}</span>,
      action: onProfileToggle,
      tooltip: "Open account settings",
      active: false,
    },
    {
      key: "profile",
      label: isAuthenticated ? "Profile" : "Login",
      icon: <span className="sidebar__icon">{"\u25ef"}</span>,
      action: onProfileToggle,
      tooltip: isAuthenticated ? "View profile" : "Login",
      active: isProfileOpen,
    },
    {
      key: "logout",
      label: "Logout",
      icon: <span className="sidebar__icon">{"\u21e5"}</span>,
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

    if (item.route && normalizedPath !== item.route) {
      navigate(item.route);
    }
  };

  const handleWorkflowStepClick = (workflowStep: WorkflowStep) => {
    if (workflowStep.step > maxVisitedWorkflowStep) return;

    if (normalizedPath !== workflowStep.route) {
      navigate(workflowStep.route);
    }
  };

  const renderSidebarItem = (item: SidebarItem) => (
    <button
      key={item.key}
      type="button"
      className={`sidebar__item${item.active ? " sidebar__item--active" : ""}`}
      onClick={() => handleItemClick(item)}
      aria-current={item.active ? "page" : undefined}
      title={isVisuallyExpanded ? undefined : item.tooltip}
    >
      <span className="sidebar__item-icon">{item.icon}</span>
      <span className="sidebar__item-label">{item.label}</span>
    </button>
  );

  return (
    <aside
      className={`sidebar ${isVisuallyExpanded ? "sidebar--expanded" : "sidebar--collapsed"}`}
      onPointerEnter={handleSidebarEnter}
      onPointerLeave={handleSidebarLeave}
    >
      <div className="sidebar__inner">
        <button
          type="button"
          className="sidebar__toggle"
          onClick={onToggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="sidebar__toggle-icon">{"\u2630"}</span>
          <span className="sidebar__toggle-label">Menu</span>
        </button>

        <nav className="sidebar__nav" aria-label="Sidebar navigation">
          <section className="sidebar__workflow" aria-label="Migration workflow">
            <div className="sidebar__section-title">Migration Workflow</div>
            <div className="sidebar__workflow-list">
              {workflowSteps.map((workflowStep) => {
                const isActive = currentWorkflowStep === workflowStep.step;
                const isCompleted = currentWorkflowStep > workflowStep.step;
                const isUnlocked = workflowStep.step <= maxVisitedWorkflowStep;
                const isUpcoming = !isUnlocked;
                const className = [
                  "sidebar__workflow-step",
                  isCompleted ? "sidebar__workflow-step--completed" : "",
                  isActive ? "sidebar__workflow-step--active" : "",
                  isUpcoming ? "sidebar__workflow-step--upcoming" : "",
                ].filter(Boolean).join(" ");

                return (
                  <button
                    key={workflowStep.key}
                    type="button"
                    className={className}
                    onClick={() => handleWorkflowStepClick(workflowStep)}
                    aria-current={isActive ? "step" : undefined}
                    disabled={!isUnlocked}
                  >
                    <span className="sidebar__workflow-marker" aria-hidden="true">
                      {isCompleted ? "\u2713" : ""}
                    </span>
                    <span className="sidebar__workflow-label">{workflowStep.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="sidebar__nav-section">
            {primaryItems.map(renderSidebarItem)}
          </div>

          <div className="sidebar__nav-section sidebar__nav-section--utility">
            {utilityItems.map(renderSidebarItem)}
          </div>
        </nav>
      </div>
    </aside>
  );
}
