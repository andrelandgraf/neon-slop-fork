import type { SealedLiveQuery } from "@neon/realtime/client";
import type { LiveCollectionName, LiveParams } from "./load";

/** Set once the session changed under this page; a full page load resets it. */
let leaving = false;

/**
 * The page belongs to a session that's gone: signed out, signed in as
 * someone else, or switched org in another tab. A full page load drops this
 * user's collections and lets the server redirect to the right place. The
 * collections retry renewals every second, so stop calling the server.
 */
export function leavePage(): never {
  if (!leaving) {
    leaving = true;
    window.location.reload();
  }
  throw new Error("The session changed. Reloading the page.");
}

function isSealedQuery<Row>(value: unknown): value is SealedLiveQuery<Row> {
  return (
    typeof value === "object" &&
    value !== null &&
    "capability" in value &&
    typeof value.capability === "string" &&
    "expiresAt" in value &&
    typeof value.expiresAt === "number" &&
    "queryFingerprint" in value &&
    typeof value.queryFingerprint === "string"
  );
}

export async function renewLiveQuery<Row>(
  name: LiveCollectionName,
  params: LiveParams
): Promise<SealedLiveQuery<Row>> {
  if (leaving) throw new Error("The session changed. Reloading the page.");
  const response = await fetch(`/api/live/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  if (response.status === 401) leavePage();
  if (!response.ok) throw new Error(`Couldn't renew the ${name} live query (${response.status}).`);
  const body: unknown = await response.json();
  if (!isSealedQuery<Row>(body)) throw new Error(`The ${name} renewal returned no sealed query.`);
  return body;
}
