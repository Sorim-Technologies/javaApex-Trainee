import type { ReactNode } from "react";
import "./Migration.css";

export default function MigrationPage({ children }: { children: ReactNode }) {
  return <div className="migration-page">{children}</div>;
}
