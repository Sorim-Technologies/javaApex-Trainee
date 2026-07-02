import React from "react";
import { ChevronRight, Clock, Download, History, RefreshCw } from "lucide-react";

const iconMap = {
  rerun: RefreshCw,
  download: Download,
  history: History,
  schedule: Clock,
};

export default function QuickActions({ actions = [] }) {
  return (
    <section className="migration-dashboard-card quick-actions-card">
      <div className="migration-card-heading">
        <div>
          <h3>Quick Actions</h3>
          <p>Common actions for this migration workflow.</p>
        </div>
      </div>

      <div className="quick-action-list">
        {actions.map((action) => {
          const Icon = iconMap[action.icon] || RefreshCw;
          return (
            <button type="button" key={action.title} onClick={action.onClick}>
              <span className={`quick-action-icon ${action.tone || "blue"}`}><Icon size={17} /></span>
              <span>
                <strong>{action.title}</strong>
                <small>{action.description}</small>
              </span>
              <ChevronRight size={17} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
