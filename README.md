# Neon Slop Fork

> **slopfork** /ˈslɑpˌfɔrk/: a hastily produced software clone that imitates the surface features, design language, or "vibe" of an existing product while lacking architectural rigor, security hardening, or production readiness. ([slopfork.dev](https://slopfork.dev))

Guilty as charged. This is a clone of the Neon console, built from scratch on the [Neon API](https://neon.com/docs/reference/api-reference). Every project, branch and compute you manage here goes through the same endpoints you can call with an API key, from a script, an agent or your own platform.

Try it at [neon-slop-fork.vercel.app](https://neon-slop-fork.vercel.app).

## In the agentic era, APIs are the product

Agents are changing how we build software and they're doing it at agent speed. They're far better (faster, more token-efficient) at using APIs, CLIs and MCP servers than at clicking through a dashboard. Give an agent an API key and it can rule the world (or at least your dev tool).

For the best developer and agent experience, think of your open API as the core of your product. That's the bet Neon makes: if you can do it in the console, there's an endpoint for it too.

As a developer, you can use the API to automate everything around the platform and build on top of it. As an agent, you can do the same at agent speed, without getting stuck behind the console's bot protection.

Neon went all in on its API because of Neon for [(agentic) platforms](https://neon.com/agents). Neon works as infrastructure behind other products: [Vercel](https://vercel.com/docs/storage/vercel-postgres), [Netlify DB](https://www.netlify.com/products/database/), Replit and Laravel Cloud all manage fleets of Neon databases through the same APIs you have access to. If they can build a platform on top of Neon, so can you.

So I slop forked Neon to prove that you can literally rebuild the Neon console from scratch on Neon's APIs. Check it out: [sign up](https://neon-slop-fork.vercel.app/signup) and provision real Neon resources through the slop fork.

## Now powered by Neon Realtime

The console is live. Create, rename or delete a project, branch, bucket or credential in one tab and every other open tab updates without a reload, including the "Creating project" state. On the Tables page, rows from your own database stream in when Realtime is on for the branch. It runs on [Neon Realtime](https://neon.com/docs/realtime/overview) and [TanStack DB](https://tanstack.com/db).

## Contributing

Setup, checks, how the live views work and deploys: [CONTRIBUTING.md](CONTRIBUTING.md).
