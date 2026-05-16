"use client";
import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { switchOrgAction, createOrgAction } from "@/app/actions";

interface OrgItem {
  id: string;
  slug: string;
  name: string;
}

export function OrgSwitcher({
  orgs,
  activeOrg,
}: {
  orgs: OrgItem[];
  activeOrg: OrgItem;
}) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [pending, startTransition] = useTransition();
  const [createPending, startCreateTransition] = useTransition();

  function handleSwitch(orgId: string) {
    if (orgId === activeOrg.id) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      try {
        await switchOrgAction(orgId);
        setOpen(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to switch org."
        );
      }
    });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Belt-and-braces: even though the submit button is disabled
    // while `createPending` is true, React can let a second click
    // land before the disabled state renders. This guard makes the
    // duplicate POST impossible (a real bug we saw in prod where
    // two app_org rows landed in the meta DB one second apart).
    if (createPending) return;
    const trimmed = orgName.trim();
    if (!trimmed) return;
    const formData = new FormData();
    formData.set("name", trimmed);
    startCreateTransition(async () => {
      try {
        await createOrgAction(formData);
        // createOrgAction ends with `redirect("/projects")` so this
        // line only runs if the action threw a non-redirect error;
        // the redirect path is handled by Next router.
        setCreateOpen(false);
        setOrgName("");
      } catch (err) {
        // Next redirects throw a special "NEXT_REDIRECT" digest; let
        // it bubble so the navigation completes. Anything else is a
        // real failure worth surfacing.
        if (
          typeof err === "object" &&
          err !== null &&
          "digest" in err &&
          typeof (err as { digest?: string }).digest === "string" &&
          (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
          throw err;
        }
        toast.error(
          err instanceof Error ? err.message : "Failed to create organization."
        );
      }
    });
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm rounded-md px-1.5 py-0.5 -mx-0.5 hover:bg-muted"
          >
            <span className="font-semibold">{activeOrg.name}</span>
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted border font-medium">
              Free
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Organizations
          </DropdownMenuLabel>
          {orgs.map((o) => (
            <DropdownMenuItem
              key={o.id}
              onSelect={(e) => {
                e.preventDefault();
                handleSwitch(o.id);
              }}
              disabled={pending}
              className="flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate">{o.name}</div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  {o.slug}
                </div>
              </div>
              {pending && o.id !== activeOrg.id ? (
                <Loader2 className="h-4 w-4 animate-spin opacity-60" />
              ) : o.id === activeOrg.id ? (
                <Check className="h-4 w-4" />
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setOpen(false);
              setCreateOpen(true);
            }}
            className="text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={createOpen}
        onOpenChange={(next) => {
          if (createPending) return;
          setCreateOpen(next);
          if (!next) setOrgName("");
        }}
      >
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create organization</DialogTitle>
              <DialogDescription>
                A virtual workspace. Projects you create belong to the active
                org and only its members can see them.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 my-3">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                name="name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Inc."
                autoFocus
                maxLength={64}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPending || !orgName.trim()}
              >
                {createPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {createPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
