import type { ReactNode } from "react";
import "./Result.css";

export default function ResultPage({ children }: { children: ReactNode }) {
  return <div className="result-page">{children}</div>;
}
