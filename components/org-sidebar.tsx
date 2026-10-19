"use client";
import { Building2, CreditCard, LayoutGrid, Puzzle, Users } from "lucide-react";
import { NavHeading, NavLink, SidebarFrame } from "@/components/sidebar-frame";

const ITEMS = [
  { href: "/projects", label: "Projects", icon: LayoutGrid },
  { href: "/org/people", label: "People", icon: Users },
  { href: "/org/billing", label: "Billing", icon: CreditCard },
  { href: "/org/integrations", label: "Integrations", icon: Puzzle },
  { href: "/org/settings", label: "Settings", icon: Building2 },
];

export function OrgSidebar() {
  return (
    <SidebarFrame>
      <NavHeading>Organization</NavHeading>
      <nav className="space-y-0.5">
        {ITEMS.map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}
      </nav>
    </SidebarFrame>
  );
}
