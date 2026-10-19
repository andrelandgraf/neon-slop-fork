"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Plus,
  Settings,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import { ThemeMenuItems } from "@/components/theme-menu-items";
import { CreateOrgDialog } from "@/components/create-org-dialog";
import { switchOrgAction } from "@/app/actions";

interface OrgItem {
  id: string;
  name: string;
}

const HELP_LINKS = [
  { label: "Docs", href: "https://neon.com/docs" },
  { label: "Changelog", href: "https://neon.com/docs/changelog" },
  { label: "Discord", href: "https://neon.com/discord" },
  { label: "Support", href: "https://neon.com/docs/introduction/support" },
] as const;

export function AccountMenu({
  user,
  orgs,
  activeOrg,
}: {
  user: { name: string; email: string; image: string | null };
  orgs: OrgItem[];
  activeOrg: OrgItem;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  function handleSignOut() {
    startTransition(async () => {
      try {
        await signOut();
        router.push("/");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sign-out failed.");
      }
    });
  }

  function handleSwitch(orgId: string) {
    if (orgId === activeOrg.id) return;
    startTransition(async () => {
      try {
        await switchOrgAction(orgId);
        router.push("/projects");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to switch org.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`${activeOrg.name} account menu button`}
            className="flex h-7 items-center gap-2 rounded-md px-2 font-semibold text-sm transition-colors hover:bg-nav-active aria-expanded:bg-nav-active"
          >
            <Avatar name={user.name} email={user.email} image={user.image} />
            <span className="max-w-[160px] truncate">{activeOrg.name}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[260px] p-0">
          <div className="p-1">
            <DropdownMenuLabel className="flex items-center gap-1.5 font-normal text-muted-foreground text-xs">
              <Building2 className="size-3.5" />
              Organization
            </DropdownMenuLabel>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="py-1.5">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{activeOrg.name}</div>
                  <div className="text-muted-foreground text-xs">Free</div>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-[240px]">
                {orgs.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    disabled={pending}
                    onSelect={() => handleSwitch(org.id)}
                  >
                    <span className="flex-1 truncate">{org.name}</span>
                    {org.id === activeOrg.id ? (
                      <Check className="size-3.5" />
                    ) : pending ? (
                      <Loader2 className="size-3.5 animate-spin opacity-60" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  Create organization
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem asChild className="font-semibold">
              <Link href="/org/settings">Manage</Link>
            </DropdownMenuItem>
          </div>
          <DropdownMenuSeparator className="my-0" />
          <div className="p-1">
            <DropdownMenuLabel className="flex items-center gap-1.5 font-normal text-muted-foreground text-xs">
              <UserRound className="size-3.5" />
              Account
            </DropdownMenuLabel>
            <div className="px-1.5 pb-1">
              <div className="truncate font-semibold text-sm">{user.name}</div>
              <div className="truncate text-muted-foreground text-xs">
                {user.email}
              </div>
            </div>
            <DropdownMenuItem
              disabled
              className="font-semibold"
              title="Account settings live on console.neon.tech, not in this clone."
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="font-semibold">
                <span className="flex-1">Theme</span>
                <Settings className="size-3.5 text-muted-foreground" />
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <ThemeMenuItems />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem asChild className="font-semibold">
              <a href="https://neonstatus.com" target="_blank" rel="noreferrer">
                Status
                <ExternalLink className="size-3 text-muted-foreground" />
                <span className="ml-auto flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-semibold text-[11px]">
                  <span className="size-1.5 rounded-full bg-primary" />
                  All OK
                </span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="font-semibold">
                Help
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {HELP_LINKS.map((link) => (
                  <DropdownMenuItem key={link.label} asChild>
                    <a href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              onSelect={handleSignOut}
              disabled={pending}
              className="font-semibold"
            >
              Log out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

function Avatar({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image: string | null;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" className="size-5 rounded-full object-cover" />
    );
  }
  return (
    <span className="grid size-5 place-items-center rounded-full bg-foreground font-semibold text-[10px] text-background">
      {(name[0] ?? email[0] ?? "?").toUpperCase()}
    </span>
  );
}
