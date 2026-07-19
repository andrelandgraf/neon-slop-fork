"use client";
import * as React from "react";
import {
  type ResolvedTheme,
  type Theme,
  THEME_STORAGE_KEY,
  isTheme,
  resolveTheme,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const DARK_QUERY = "(prefers-color-scheme: dark)";

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(DARK_QUERY).matches;
}

function applyResolvedTheme(resolved: ResolvedTheme): void {
  const el = document.documentElement;
  el.classList.toggle("dark", resolved === "dark");
  el.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to "system"; the no-flash script has already applied the correct
  // class, and the mount effect below reconciles React state with storage.
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [systemPrefersDark, setSystemPrefersDark] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) setThemeState(stored);
    setSystemPrefersDark(getSystemPrefersDark());
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) =>
      setSystemPrefersDark(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = resolveTheme(theme, systemPrefersDark);

  React.useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); theme still applies for the session.
    }
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
