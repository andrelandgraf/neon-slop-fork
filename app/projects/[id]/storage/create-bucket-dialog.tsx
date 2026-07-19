"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createBucketAction } from "@/app/actions";
import { DEMO_STORAGE_LIMITS } from "@/lib/limits";

export function CreateBucketDialog({
  projectId,
  branchId,
  branchName,
  region,
  triggerLabel = "Create bucket",
}: {
  projectId: string;
  branchId: string;
  branchName: string;
  region: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public_read">("private");
  const [error, setError] = useState<string | null>(null);

  const isFirst = triggerLabel !== "Create bucket";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setError(null);
          setName("");
          setVisibility("private");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={
            isFirst
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-foreground text-background hover:bg-foreground/90"
          }
        >
          <Plus className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create bucket</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Buckets hold your objects. Names are globally unique within a project,
          scoped to <code className="font-mono">{branchName}</code>. Bucket
          settings can’t be edited after creation. This demo instance allows up
          to {DEMO_STORAGE_LIMITS.maxBucketsPerBranch} buckets per branch.
        </p>

        <form
          action={async (formData: FormData) => {
            const result = await createBucketAction(formData);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setOpen(false);
            router.refresh();
          }}
          className="space-y-4"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="branchId" value={branchId} />
          <input type="hidden" name="access_level" value={visibility} />

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Branch</span>
              <span className="font-mono">{branchName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Region</span>
              <span className="font-mono">{region}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bucket-name">Bucket name</Label>
            <Input
              id="bucket-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-bucket"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground mb-1">
              Visibility
            </legend>
            <VisibilityOption
              checked={visibility === "private"}
              onSelect={() => setVisibility("private")}
              title="Private"
              description="Only signed requests can read or write. Use for user data and internal assets."
            />
            <VisibilityOption
              checked={visibility === "public_read"}
              onSelect={() => setVisibility("public_read")}
              title="Public"
              description="Anyone with the object URL can read. Use for static assets and avatars."
            />
          </fieldset>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="font-mono">{error}</div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton disabled={!name.trim()} pendingLabel="Creating…">
              Create bucket
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VisibilityOption({
  checked,
  onSelect,
  title,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input
        type="radio"
        name="visibility-radio"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 h-3.5 w-3.5 accent-[color:hsl(var(--primary))]"
      />
      <div className="text-sm">
        <div className="font-medium">{title}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}
