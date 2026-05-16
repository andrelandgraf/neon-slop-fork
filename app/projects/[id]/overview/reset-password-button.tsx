"use client";
import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { resetRolePasswordAction } from "@/app/actions";

export function ResetPasswordButton({
  projectId,
  branchId,
  roleName,
}: {
  projectId: string;
  branchId: string;
  roleName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleReset() {
    setPending(true);
    try {
      const res = await resetRolePasswordAction(projectId, branchId, roleName);
      setPassword(res.password);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!password) return;
    await navigator.clipboard.writeText(password).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPassword(null);
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <KeyRound className="h-3.5 w-3.5" />
        Reset password
      </Button>
      <DialogContent>
        {password ? (
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-emerald-600" />
                New password for {roleName}
              </DialogTitle>
              <DialogDescription>
                Copy it now — Neon does not show this value again.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 rounded-md border bg-muted/30 p-3 font-mono text-[12px] break-all">
              {password}
            </div>
            <DialogFooter className="mt-3">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div>
            <DialogHeader>
              <DialogTitle>Reset password for {roleName}?</DialogTitle>
              <DialogDescription>
                A new random password is generated server-side. Existing
                connections continue with their old credentials but will
                fail to reconnect.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button onClick={handleReset} disabled={pending}>
                {pending ? "Resetting…" : "Reset password"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
