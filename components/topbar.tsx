import Link from "next/link";
import { CheckCircle2, Bot, ChevronsUpDown } from "lucide-react";
import type { TenantContext } from "@/lib/tenancy";
import { OrgSwitcher } from "./org-switcher";
import { AccountMenu } from "./account-menu";
import { NeonLogomark } from "./neon-logo";

export function TopBar({
  tenant,
  context,
}: {
  tenant: TenantContext;
  context?: string;
}) {
  return (
    <header className="h-14 border-b bg-background sticky top-0 z-30">
      <div className="flex h-full items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2" title="Home">
          <div className="h-8 w-8 rounded bg-neon-dark grid place-items-center">
            <NeonLogomark className="h-3.5 w-3.5 text-[#37C38F]" />
          </div>
        </Link>
        <OrgSwitcher
          orgs={tenant.orgs}
          activeOrg={tenant.activeOrg}
        />
        {context && (
          <>
            <div className="text-muted-foreground">/</div>
            <div className="text-sm font-mono text-foreground/80">{context}</div>
          </>
        )}
        <div className="ml-auto flex items-center gap-2 text-sm">
          <DisabledChip title="The control plane reports the same status on neon.com — this clone surfaces a static OK badge.">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            All OK
          </DisabledChip>
          <DisabledChip title="“Ask AI” opens Neon’s AI assistant on console.neon.tech. Not wired in this clone.">
            <Bot className="h-3 w-3" />
            Ask AI
          </DisabledChip>
          <AccountMenu
            name={tenant.session.user.name}
            email={tenant.session.user.email}
            image={tenant.session.user.image ?? null}
          />
        </div>
      </div>
    </header>
  );
}

function DisabledChip({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled
      title={title}
      className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground/70 cursor-not-allowed"
    >
      {children}
    </button>
  );
}
