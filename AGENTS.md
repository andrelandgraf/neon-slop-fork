# Agent instructions

This repo's Neon project is maintained through `neon.ts`, `.neon`, and the `neon` CLI — not the console.

- `.neon` is gitignored. After a clone: `neon link --project-id bitter-dawn-83086481`, then `neon checkout` a dev branch (see CONTRIBUTING.md).
- Linked project: `bitter-dawn-83086481` (`neon-slop-fork-control`, Postgres 18, Realtime enabled) in org `org-nameless-thunder-12993511`.
- Change Neon services in `neon.ts`. The `neon` CLI loads it; it is not an app dependency. Run `neon config plan` before `neon config apply`. Do not apply if the plan is unexpected.
- `neon checkout` / `neon env pull` write `DATABASE_URL`, `NEON_REALTIME_URL` and `NEON_REALTIME_SECRET` to `.env.local`. The app also reads `META_DATABASE_URL`, `NEXT_PUBLIC_NEON_REALTIME_URL`, `NEON_API_KEY`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`, which the CLI does not produce.

## App conventions

- Every project page loads through `loadProject` / `loadBranch` / `loadProjectBranch` in `lib/project-context.ts`. They check the session and that the project belongs to the active org; a page or server action that skips them is a tenancy hole.
- Branch-scoped pages live under `app/projects/[id]/branches/[branchId]/`. Build links with `branchPath`. Project-level pages read `?branch=`. When moving a route, add the old path to `lib/legacy-routes.ts`.
- Console copy, connection templates, and agent prompts are copied verbatim from console.neon.tech. Keep them verbatim when editing; a deviation that fixes broken Console output gets a comment saying so.
- Styling uses the Console tokens in `app/globals.css` (`canvas`, `panel`, `panel-border`, `nav-active`, `link`). Use the tokens, not raw hex values.
- Schema changes: there are no migration files. Run `bunx drizzle-kit push` against the dev meta branch, and against the production meta database before deploying.
- Tests: `bun test lib/`, plus `bun run typecheck` and `bun run build`.
- Live views: a view that reads Neon API state renders from the mirror tables (`lib/db/schema.ts`, `neon_*`), never from the Neon API directly. A server action that writes through the Neon API calls `projectChanged(projectId)` (or the matching sync) so the mirror and the live views update. New live collections need a query in `lib/live/queries.ts` with its authorization in the SQL, an entry in `lib/live/load.ts`, and a descriptor in `lib/live/collections.ts`.
- Live writes take the page's `PageIdentity` and call `verifyPageIdentity` before any side effect; return the txid of the statement that changed the subscribed rows.
