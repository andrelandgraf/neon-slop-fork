/**
 * Theme model — mirrors the Neon console's System / Light / Dark control.
 *
 * `Theme` is the user's stored preference; `ResolvedTheme` is what actually
 * paints (system resolves against the OS `prefers-color-scheme`). The `dark`
 * class on <html> drives Tailwind's `darkMode: ["class"]` tokens in globals.css.
 */
export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "neon-slop-theme";
export const THEMES: readonly Theme[] = ["system", "light", "dark"] as const;

export function isTheme(value: unknown): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveTheme(
  theme: Theme,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme;
}

/**
 * Inline, render-blocking script that applies the persisted theme before first
 * paint so there is no light/dark flash on load. Kept dependency-free and tiny;
 * it mirrors the resolution logic above in plain ES5 for the pre-hydration DOM.
 */
export const NO_FLASH_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY
)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"&&t!=="system"){t="system";}var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}catch(_){}})();`;
