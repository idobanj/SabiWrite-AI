import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  getEffectiveTheme,
  getStoredTheme,
  setTheme,
} from "../lib/theme";

/**
 * Dark mode hook. The initial theme is applied via an inline script in
 * index.html (so there's no flash); this hook keeps React state in sync
 * and exposes a toggle.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => getEffectiveTheme());

  // If the user has no stored preference and the system theme changes,
  // follow the system.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      if (getStoredTheme() === null) {
        const next = e.matches ? "dark" : "light";
        applyTheme(next);
        setThemeState(next);
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const toggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }, [theme]);

  const setExplicit = useCallback((next) => {
    setTheme(next);
    setThemeState(next);
  }, []);

  return { theme, toggle, setTheme: setExplicit };
}
