import "server-only";
import { createRealtime } from "@neon/realtime/server";
import { drizzleAdapter } from "@neon/realtime-drizzle";

const secret = process.env.NEON_REALTIME_SECRET;
if (!secret) throw new Error("NEON_REALTIME_SECRET is not set. See README: Realtime on the control database.");
const url = process.env.META_DATABASE_URL;
if (!url) throw new Error("META_DATABASE_URL is not set. See README.");

/** Seals live queries over the control database, the one META_DATABASE_URL names. */
export const realtime = createRealtime({
  secret,
  db: decodeURIComponent(new URL(url).pathname.slice(1)),
  adapter: drizzleAdapter(),
  debugMode: process.env.NODE_ENV === "development",
});
