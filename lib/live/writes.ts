import type { MirrorResult } from "@/lib/mirror/sync";

/** What a server action that writes live rows returns to the browser. */
export type LiveWriteResult = { ok: true; result: MirrorResult } | { ok: false; error: string; status?: 401 | 403 };

/** The write committed, but its change didn't come back over Realtime in time. */
export class NotSyncedYetError extends Error {}

/** How long a write waits for its own change; TanStack DB holds back other synced changes meanwhile. */
export const ECHO_TIMEOUT_MS = 10_000;
