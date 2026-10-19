"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { LiveStatus } from "@/components/live/live-status";
import { useMaskingStatus } from "@/components/live/project-live";
import type { LiveSeed } from "@/lib/live/load";
import type { MaskingStatusRow } from "@/lib/live/queries";
import { MaskingEditor } from "./masking-editor";

/** Rules and the schema can only be read once setup finished and while no anonymization runs. */
const readable = (state: string) => state !== "created" && state !== "anonymizing";

/**
 * The masking editor with the branch's live masking state. When the state
 * crosses into or out of a readable one, the server renders again, because
 * it loads the columns and rules the editor needs.
 */
export function LiveMasking({
  status: seed,
  serverState,
  ...editor
}: React.ComponentProps<typeof MaskingEditor> & {
  status: LiveSeed<MaskingStatusRow>;
  serverState: string;
}) {
  const router = useRouter();
  const collection = useMaskingStatus(editor.branchId, seed);
  const query = useLiveQuery({
    query: (q) => q.from({ m: collection }).where(({ m }) => eq(m.branch_id, editor.branchId)),
  });
  const status = query.data[0]?.data;
  const state = status?.state ?? serverState;
  const stale = readable(state) !== readable(serverState);
  useEffect(() => {
    if (stale) router.refresh();
  }, [stale, router]);
  return (
    <>
      <LiveStatus queries={[query]} />
      <MaskingEditor
        // The editor's draft starts from `rules`; remount once real rules load
        // so applying never replaces them with the placeholder empty list.
        key={readable(serverState) ? "ready" : "pending"}
        {...editor}
        state={state}
        statusMessage={status?.status_message ?? editor.statusMessage}
      />
    </>
  );
}
