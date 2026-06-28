import type { ReactNode } from "react";
import "./Strategy.css";

export default function StrategyPage({ children }: { children: ReactNode }) {
  return <div className="strategy-page">{children}</div>;
}
