import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/lib/db/client";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret) {
  throw new Error(
    "BETTER_AUTH_SECRET is not set. Pick a 32+ character random value."
  );
}

/**
 * Better Auth instance wired to the meta-database Drizzle schema.
 *
 * - Email + password is the primary path (mirrors Neon's "or continue
 *   with email" panel). `requireEmailVerification` is off because we
 *   intentionally don't ship an email transport — flipping it on later
 *   is one line + a real Resend key.
 * - GitHub social is included because the real Neon screen offers
 *   third-party providers. Set `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`
 *   to enable; the button is rendered no-op without those.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  socialProviders:
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          },
        }
      : undefined,
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
});

export type Session = typeof auth.$Infer.Session;
