# Agent instructions

This repo's Neon project is maintained through `neon.ts`, `.neon`, and the `neon` CLI — not the console.

- `.neon` is gitignored. After a clone: `neon link` then `neon checkout main`.
- Linked project: `lively-truth-10185875` (`neon-slop-fork-meta`) in org `org-nameless-thunder-12993511`.
- Change Neon services in `neon.ts`. The `neon` CLI loads it; it is not an app dependency. Run `neon config plan` before `neon config apply`. Do not apply if the plan is unexpected.
- `neon checkout` / `neon env pull` write `DATABASE_URL` to `.env.local`. The app still reads `META_DATABASE_URL`, plus `NEON_API_KEY`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`, which the CLI does not produce.

## App conventions

- Every project page loads through `loadProject` / `loadBranch` / `loadProjectBranch` in `lib/project-context.ts`. They check the session and that the project belongs to the active org; a page or server action that skips them is a tenancy hole.
- Branch-scoped pages live under `app/projects/[id]/branches/[branchId]/`. Build links with `branchPath`. Project-level pages read `?branch=`. When moving a route, add the old path to `lib/legacy-routes.ts`.
- Console copy, connection templates, and agent prompts are copied verbatim from console.neon.tech. Keep them verbatim when editing; a deviation that fixes broken Console output gets a comment saying so.
- Styling uses the Console tokens in `app/globals.css` (`canvas`, `panel`, `panel-border`, `nav-active`, `link`). Use the tokens, not raw hex values.
- Schema changes: there are no migration files. Run `bunx drizzle-kit push` against the dev meta branch, and against the production meta database before deploying.
- Tests: `bun test lib/`, plus `bun run typecheck` and `bun run build`.
