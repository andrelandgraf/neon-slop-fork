"use client";
import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
              {o.id === activeOrg.id && <Check className="h-4 w-4" />}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form
            action={async (formData) => {
              await createOrgAction(formData);
              setCreateOpen(false);
              setOrgName("");
            }}
          >
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!orgName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
