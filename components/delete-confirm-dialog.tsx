"use client";
import { useId, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface DeleteConfirmDialogProps {
  resourceName: string;
  resourceLabel: "project" | "bucket";
  description?: ReactNode;
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields?: Record<string, string>;
  triggerLabel?: string;
  triggerVariant?: "destructive" | "ghost";
  triggerSize?: "default" | "sm";
  triggerClassName?: string;
  confirmLabel?: string;
}

export function DeleteConfirmDialog({
  resourceName,
  resourceLabel,
  description,
  action,
  hiddenFields,
  triggerLabel,
  triggerVariant = "destructive",
  triggerSize = "default",
  triggerClassName,
  confirmLabel,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const inputId = useId();

  const matches = typed === resourceName;
  const buttonLabel = triggerLabel ?? `Delete ${resourceLabel}`;
  const confirmText =
    confirmLabel ?? `Yes, delete this ${resourceLabel}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      <DialogTrigger asChild>
        {triggerVariant === "ghost" ? (
          <Button
            type="button"
            variant="ghost"
            size={triggerSize}
            className={
              triggerClassName ??
              "text-destructive hover:bg-destructive/10"
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
            {buttonLabel}
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size={triggerSize}
            className={triggerClassName}
          >
            <Trash2 className="h-4 w-4" />
            {buttonLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={action}>
          {hiddenFields &&
            Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
          <DialogHeader>
            <DialogTitle>
              Delete &ldquo;{resourceName}&rdquo;?
            </DialogTitle>
            <DialogDescription>
              {description ?? (
                <>
                  This will permanently delete the {resourceLabel} and all of
                  its data. This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 my-3">
            <Label htmlFor={inputId}>
              Type{" "}
              <code className="font-mono text-foreground">
                {resourceName}
              </code>{" "}
              to confirm
            </Label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={resourceName}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={!matches}>
              {confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
