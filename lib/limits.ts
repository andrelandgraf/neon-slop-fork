/**
 * Guard-rails for the public OSS instance, in the same spirit as the Postgres
 * `DEMO_PROJECT_QUOTA` in `lib/neon.ts`. neon-slop-fork is open source — anyone
 * can fork it and point it at their own Neon org — so a hosted instance caps
 * per-object upload size and bucket count to keep it from being abused as free,
 * unbounded file hosting. Neon's storage API has no server-side quota knob
 * today, so we enforce these in our own server actions (bucket-create and
 * presign time). This module has no server-only imports so both the server
 * actions and the client upload UI can share the numbers. Fork owners can
 * raise or remove them; a self-hosted org isn't at risk.
 */
export const DEMO_STORAGE_LIMITS = {
  /** Largest single object a presigned upload will be minted for. */
  maxUploadBytes: 10 * 1024 * 1024, // 10 MB per object
  /** Most buckets allowed per branch. */
  maxBucketsPerBranch: 5,
} as const;
