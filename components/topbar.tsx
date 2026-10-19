import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { TenantContext } from "@/lib/tenancy";
import { AccountMenu } from "./account-menu";
import { CommandBar, type CommandBarProject } from "./command-bar";
import { NeonWordmark } from "./neon-logo";

export function TopBar({
  tenant,
  project,
}: {
  tenant: TenantContext;
  project?: CommandBarProject;
}) {
  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4">
      <Link href="/projects" className="flex w-fit items-center" title="Projects">
        <NeonWordmark />
      </Link>
      <div className="flex items-center gap-2">
        <CommandBar project={project} />
        <button
          type="button"
          disabled
          title="Ask AI opens Neon's assistant on console.neon.tech. It isn't part of this clone."
          className="flex h-7 cursor-not-allowed items-center gap-1.5 rounded-[3px] border border-panel-border bg-panel px-2.5 font-semibold text-sm opacity-60"
        >
          <Sparkles className="size-3.5 text-primary" />
          Ask AI
        </button>
      </div>
      <div className="flex justify-end">
        <AccountMenu
          user={{
            name: tenant.session.user.name,
            email: tenant.session.user.email,
            image: tenant.session.user.image ?? null,
          }}
          orgs={tenant.orgs}
          activeOrg={tenant.activeOrg}
        />
      </div>
    </header>
  );
}
