"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
}

/**
 * Sticky right-hand navigation for the project settings page.
 *
 * Mirrors `console.neon.tech/.../settings`: a vertical list of
 * anchor links, with the entry whose section is currently scrolled
 * into view highlighted. We use IntersectionObserver to track which
 * section is closest to the top of the viewport, with a small top
 * margin so the highlight changes as the section's heading crosses
 * the top edge (not its bottom).
 */
export function SettingsNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="text-[13px] sticky top-6 self-start">
      <ul className="space-y-1.5 border-l">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block -ml-px border-l pl-3 py-0.5 transition-colors",
                active === item.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
