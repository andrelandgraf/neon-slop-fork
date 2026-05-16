"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    typeof window === "undefined"
      ? process.env.BETTER_AUTH_URL
      : window.location.origin,
});

export const { signIn, signUp, signOut, useSession } = authClient;
