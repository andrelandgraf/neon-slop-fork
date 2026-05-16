"use client";
import { useState } from "react";
import { Plus, Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectApiKeyAction } from "@/app/actions";

interface CreatedKey {
  id: number;
  key: string;
  name: string;
  created_at: string;
}

export function CreateApiKeyDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setName("");
    setCreated(null);
    setCopied(false);
    setPending(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    try {
      const k = await createProjectApiKeyAction(projectId, name.trim());
      setCreated(k);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create API key."
      );
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
      setCopied(true);
      toast.success("Key copied to clipboard.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy. Select and copy manually.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Create key
        </Button>
      </DialogTrigger>
      <DialogContent>
        {!created ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Mint a project-scoped Neon API key. The plaintext value is
                shown once after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 my-3">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-service"
                autoFocus
                maxLength={128}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-emerald-600" />
                Save your key
              </DialogTitle>
              <DialogDescription>
                The plaintext key is shown only once. Copy it now and store it
                somewhere safe.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 space-y-2">
              <div className="rounded-md border bg-muted/30 p-3 font-mono text-[12px] break-all">
                {created.key}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Name: <span className="font-medium">{created.name}</span>
                </span>
                <Button size="sm" variant="outline" onClick={handleCopy}>
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
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
