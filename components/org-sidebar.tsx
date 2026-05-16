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
    <aside className="w-[240px] shrink-0 border-r bg-background flex flex-col h-[calc(100vh-3.5rem)] sticky top-14">
      <div className="p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
          Organization
        </div>
        <nav className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const className = cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm w-full",
              active && "bg-muted font-medium",
              !active && !item.disabled && "hover:bg-muted",
              item.disabled && "text-muted-foreground/45 cursor-not-allowed"
            );
            const content = (
              <>
                <Icon className="h-4 w-4" />
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

      <div className="mt-auto p-3 border-t flex flex-col gap-1">
        <div
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/45 cursor-not-allowed"
          title="Not implemented"
          aria-disabled="true"
        >
          <span>💬</span>
          Feedback
        </div>
        <div
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/45 cursor-not-allowed"
          title="Not implemented"
          aria-disabled="true"
        >
          <PanelLeftClose className="h-4 w-4" />
          Collapse menu
        </div>
      </div>
    </aside>
  );
}
