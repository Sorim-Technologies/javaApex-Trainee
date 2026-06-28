import React from "react";
import "./Shared.css";

const TopBar: React.FC = () => (
  <header className="shared-topbar">
    <div className="shared-topbar__brand">
      <span className="shared-topbar__brand-icon">☕</span>
    </div>
    <div className="shared-topbar__status">
      <span className="shared-topbar__badge">🔄 OpenRewrite Powered</span>
      <span>📧 Notifications</span>
      <span className="shared-topbar__online">✅ API Online</span>
      <span className="shared-topbar__user">👤 Developer</span>
    </div>
  </header>
);

export default TopBar;
