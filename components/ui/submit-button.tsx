"use client";
import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface SubmitButtonProps extends Omit<ButtonProps, "type"> {
  /**
   * Label shown while the form action is pending. Defaults to the
   * children with a leading spinner; pass a string to override.
   */
  pendingLabel?: React.ReactNode;
}

/**
 * Submit button bound to its parent `<form action={…}>` via
 * `useFormStatus()`. Disables itself and shows a spinner while the
 * server action is in flight, so every form gets a consistent loading
 * affordance without per-form `useTransition` plumbing.
 *
 * MUST be rendered inside a `<form>` — `useFormStatus` reads the
 * status of the *nearest* form context. Using it outside a form will
 * return a permanently idle state (silently does nothing useful).
 */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...rest}>
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
