import { NeonApiError } from "@neon/sdk";

/** Neon appends request context after `;`; the user only needs the sentence. */
function stripApiErrorContext(message: string): string {
  return message.replace(/;\s*\w+:".*$/s, "").trim() || message;
}

/** The message Neon gave for a failed call, for showing in a toast. */
export function apiErrorMessage(err: unknown): string | null {
  if (err instanceof NeonApiError) {
    const body = err.body;
    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
    ) {
      return stripApiErrorContext(body.message);
    }
    return stripApiErrorContext(err.message);
  }
  if (err instanceof Error && err.message) return stripApiErrorContext(err.message);
  return null;
}
