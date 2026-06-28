import React from "react";
import "./Shared.css";

const Sidebar: React.FC = () => (
  <aside className="shared-sidebar">
    <div className="shared-sidebar__header">Java Migration</div>
    <nav className="shared-sidebar__nav">
      <ul className="shared-sidebar__list">
        <li className="shared-sidebar__item shared-sidebar__item--active">🚀 Migration Plans</li>
        <li className="shared-sidebar__item">📊 Report Summary</li>
        <li className="shared-sidebar__item">⚙️ Admin Tools</li>
        <li className="shared-sidebar__item">👥 Multi User</li>
        <li className="shared-sidebar__item">💰 Pricing</li>
        <li className="shared-sidebar__item">🆘 Support</li>
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
