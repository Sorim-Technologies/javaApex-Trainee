import type { ReactNode } from "react";
import "./Migration.css";

export default function MigrationProgress({ children }: { children: ReactNode }) {
  return <div className="migration-progress-page">{children}</div>;
}
