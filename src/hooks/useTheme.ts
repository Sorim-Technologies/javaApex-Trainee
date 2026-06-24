import { useCallback, useEffect, useState } from "react";

function getInitialTheme(): string {
  try {
    const stored = localStorage.getItem("theme");
    if (stored) return stored;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    /* ignore */
  }
  return "light";
}

export default function useTheme() {
  const [theme, setTheme] = useState<string>(getInitialTheme);

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("theme-dark");
    else document.documentElement.classList.remove("theme-dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return { theme, setTheme, toggle };
}
