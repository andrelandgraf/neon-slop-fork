"use client";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import type { Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/**
 * Theme picker rendered inside the account dropdown, matching the Neon
 * console's "Theme: System / Light / Dark". Selecting keeps the menu open
 * (preventDefault) so the active check visibly moves.
 */
export function ThemeMenuItems() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <DropdownMenuItem
          key={value}
          onSelect={(event) => {
            event.preventDefault();
            setTheme(value);
          }}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="flex-1">{label}</span>
          {theme === value && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}
