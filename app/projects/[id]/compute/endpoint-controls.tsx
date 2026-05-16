"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Play, PauseCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startEndpointAction, suspendEndpointAction } from "@/app/actions";

export function EndpointControls({
  projectId,
  endpointId,
  state,
}: {
  projectId: string;
  endpointId: string;
  state: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleStart() {
    startTransition(async () => {
      try {
        await startEndpointAction(projectId, endpointId);
        toast.success("Endpoint started.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start.");
      }
    });
  }

  function handleSuspend() {
    startTransition(async () => {
      try {
        await suspendEndpointAction(projectId, endpointId);
        toast.success("Endpoint suspended.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to suspend.");
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleStart}
        disabled={pending || state === "active"}
      >
        {pending && state !== "active" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        Start
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSuspend}
        disabled={pending || state !== "active"}
      >
        {pending && state === "active" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <PauseCircle className="h-3.5 w-3.5" />
        )}
        Suspend
      </Button>
    </>
  );
}
