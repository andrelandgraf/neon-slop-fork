# Agent instructions

This repo's Neon project is maintained through `neon.ts`, `.neon`, and the `neon` CLI — not the console.

- `.neon` is gitignored. After a clone: `neon link` then `neon checkout main`.
- Linked project: `lively-truth-10185875` (`neon-slop-fork-meta`) in org `org-nameless-thunder-12993511`.
- Change Neon services in `neon.ts`. The `neon` CLI loads it; it is not an app dependency. Run `neon config plan` before `neon config apply`. Do not apply if the plan is unexpected.
- `neon checkout` / `neon env pull` write `DATABASE_URL` to `.env.local`. The app still reads `META_DATABASE_URL`, plus `NEON_API_KEY`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`, which the CLI does not produce.
