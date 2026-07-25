"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  CreditCard,
  Plug,
  Settings,
  PanelLeftClose,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function OrgSidebar() {
  const pathname = usePathname();

  const items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
  }[] = [
    { href: "/projects", label: "Projects", icon: LayoutGrid },
    { href: "/people", label: "People", icon: Users, disabled: true },
    { href: "/billing", label: "Billing", icon: CreditCard, disabled: true },
    { href: "/integrations", label: "Integrations", icon: Plug, disabled: true },
    { href: "/settings", label: "Settings", icon: Settings, disabled: true },
  ];

  return (
    <aside className="sticky top-14 flex h-[calc(100vh-3.5rem)] w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="p-3">
        <div className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Organization
        </div>
        <nav className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const className = cn(
              "relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              active &&
                "bg-sidebar-accent font-medium text-sidebar-primary before:absolute before:top-1/2 before:left-0 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-sidebar-primary",
              !active &&
                !item.disabled &&
                "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              item.disabled && "cursor-not-allowed text-muted-foreground/45"
            );
            const content = (
              <>
                <Icon className="size-4" />
                <span className="flex-1">{item.label}</span>
              </>
            );
            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  className={className}
                  title="Not implemented in this clone"
                  aria-disabled="true"
                >
                  {content}
                </div>
              );
            }
            return (
              <Link key={item.label} href={item.href} className={className}>
                {content}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border p-3">
        <div
          className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/45"
          title="Not implemented"
          aria-disabled="true"
        >
          <MessageSquare className="size-4" />
          Feedback
        </div>
        <div
          className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/45"
          title="Not implemented"
          aria-disabled="true"
        >
          <PanelLeftClose className="size-4" />
          Collapse menu
        </div>
      </div>
    </aside>
  );
}
