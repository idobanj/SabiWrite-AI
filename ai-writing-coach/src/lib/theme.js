const STORAGE_KEY = "theme";

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* localStorage may be disabled (e.g. private mode) */
  }
  return null;
}

export function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setTheme(theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function getEffectiveTheme() {
  return getStoredTheme() ?? getSystemTheme();
}
