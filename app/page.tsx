import Link from "next/link";
import {
  ArrowRight,
  GitBranch,
  Database,
  Zap,
  Activity,
  Terminal,
  Shield,
  Github,
  Sparkles,
  Wrench,
  Boxes,
} from "lucide-react";
import { NeonLogomark } from "@/components/neon-logo";

export const metadata = {
  title:
    "Neon Clone — A community-built console for serverless Postgres",
  description:
    "An open clone of the Neon dashboard. Projects, branches, monitoring, SQL editor, tables, and settings, all on top of the public Neon API.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white antialiased">
      <LandingHeader />
      <Hero />
      <WhatThisIs />
      <Features />
      <Branching />
      <BuiltOnNeon />
      <ForkIt />
      <CallToAction />
      <Footer />
    </div>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="grid h-7 w-7 place-items-center rounded bg-white/10">
            <NeonLogomark className="h-3.5 w-3.5 text-[#37C38F]" />
          </span>
          <span>Neon Clone</span>
          <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/70">
            Slop Fork
          </span>
        </Link>
        <nav className="hidden items-center gap-5 text-[13px] text-white/70 md:flex">
          <a href="#features" className="hover:text-white">
            Features
          </a>
          <a href="#branching" className="hover:text-white">
            Branching
          </a>
          <a
            href="https://neon.com/docs"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white"
          >
            Neon docs
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href="https://github.com/andrelandgraf/neon-slop-fork"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-white/70 transition-colors hover:text-white"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-[13px] text-white/70 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/projects"
            className="rounded-md bg-[#00e599] px-3 py-1.5 text-[13px] font-semibold text-black transition-colors hover:bg-[#00ffaa]"
          >
            Open console
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(900px circle at 50% -20%, rgba(0,229,153,0.18), transparent 60%), radial-gradient(600px circle at 90% 30%, rgba(0,229,153,0.08), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-[1100px] px-6 pt-20 pb-24 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] text-white/80">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
          A community clone of console.neon.tech, built on the public Neon API
        </div>
        <h1 className="mx-auto max-w-[920px] text-[56px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[68px]">
          The Neon console, <span className="text-[#00e599]">forked</span> &mdash;
          built in public, on the public API.
        </h1>
        <p className="mx-auto mt-6 max-w-[720px] text-[17px] leading-[1.6] text-white/70">
          A demo of how far the Neon Open API takes you. Projects, branches,
          monitoring, SQL editor, tables and settings &mdash; all rebuilt on the
          same REST API any agent, platform or app can call. No backdoors, no
          special access. Proof you can build your own Neon console.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#00e599] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#00ffaa]"
          >
            Open the console
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://neon.com/docs/reference/api-reference"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            Read Neon API docs
          </a>
        </div>
      </div>
    </section>
  );
}

function WhatThisIs() {
  const cards = [
    {
      icon: Sparkles,
      eyebrow: "What this is",
      title: "A clone of the Neon dashboard.",
      body: "Projects, branches, monitoring, SQL editor, tables &mdash; rebuilt from scratch on the public Neon API. It looks and feels like console.neon.tech because it talks to the same backend, just through the docs.",
      cta: { label: "Open the console", href: "/projects", internal: true },
    },
    {
      icon: Boxes,
      eyebrow: "What it's for",
      title: "Proof of the Neon Open API.",
      body: "Everything here runs on endpoints any platform can call &mdash; the same surface Replit, Netlify DB, Vercel and others build on top of. If the console can do it, your product can too.",
      cta: {
        label: "Neon for agents & platforms",
        href: "https://neon.com/programs/agents",
        internal: false,
      },
    },
    {
      icon: Wrench,
      eyebrow: "What it's for",
      title: "Inspiration to fork your own.",
      body: "Want a custom console for your own fleet of Neon databases? Fork this repo, rip out what you don't need, add the dashboards, automations and views you actually want.",
      cta: {
        label: "Fork on GitHub",
        href: "https://github.com/andrelandgraf/neon-slop-fork",
        internal: false,
      },
    },
  ];
  return (
    <section className="border-t border-white/10 bg-white/[0.02]">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00e599]">
          Why this exists
        </div>
        <h2 className="mt-2 max-w-[820px] text-[34px] font-semibold leading-[1.15] tracking-[-0.025em]">
          A clone, a demo, and a starter kit &mdash; all on the public Neon API.
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {cards.map(({ icon: Icon, eyebrow, title, body, cta }) => (
            <div
              key={title}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-[#00e599]/10">
                  <Icon className="h-4 w-4 text-[#00e599]" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  {eyebrow}
                </span>
              </div>
              <div
                className="mt-4 text-[18px] font-semibold leading-snug"
                dangerouslySetInnerHTML={{ __html: title }}
              />
              <p
                className="mt-2 flex-1 text-[13.5px] leading-relaxed text-white/65"
                dangerouslySetInnerHTML={{ __html: body }}
              />
              {cta.internal ? (
                <Link
                  href={cta.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#00e599] hover:text-[#00ffaa]"
                >
                  {cta.label} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <a
                  href={cta.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#00e599] hover:text-[#00ffaa]"
                >
                  {cta.label} <ArrowRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: Database,
      title: "Projects",
      body: "List every project in the org, see storage and compute totals, create new projects on any region/Postgres version.",
    },
    {
      icon: GitBranch,
      title: "Branches",
      body: "List, fork, and delete branches in seconds. Each branch is a full copy of the data, copy-on-write.",
    },
    {
      icon: Activity,
      title: "Monitoring",
      body: "RAM, CPU, connections, working-set size, database size &mdash; the same time-series Neon shows you, on the live API.",
    },
    {
      icon: Terminal,
      title: "SQL editor",
      body: "Run ad-hoc queries against any branch over Neon's serverless driver. Results stream back into a typed table.",
    },
    {
      icon: Zap,
      title: "Tables",
      body: "Browse every table in every database in every branch. Schema, rows, and quick navigation.",
    },
    {
      icon: Shield,
      title: "Backup & Restore",
      body: "Point-in-time restore for any branch using Neon's BranchRestore API &mdash; pick a timestamp and roll back.",
    },
  ];
  return (
    <section id="features" className="border-t border-white/10">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00e599]">
          Features
        </div>
        <h2 className="mt-2 text-[34px] font-semibold tracking-[-0.025em]">
          Same console. Open implementation.
        </h2>
        <p className="mt-3 max-w-[640px] text-white/65">
          Everything you can do in the Neon console you can do here. Anything we
          can&apos;t do through the public API is greyed out and labelled, instead
          of faked.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
            >
              <Icon className="h-5 w-5 text-[#00e599]" />
              <div className="mt-3 text-[15px] font-semibold">{title}</div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/65">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Branching() {
  return (
    <section
      id="branching"
      className="border-t border-white/10 bg-white/[0.02]"
    >
      <div className="mx-auto max-w-[1100px] px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00e599]">
              Branching
            </div>
            <h2 className="mt-2 text-[34px] font-semibold tracking-[-0.025em]">
              Fork your data the way you fork your code.
            </h2>
            <p className="mt-3 text-white/65">
              Neon&apos;s killer feature is data branching: copy-on-write
              forks of your Postgres database in seconds. Use them for preview
              environments, ad-hoc experiments, schema migrations, or rolling
              back a bad migration without restoring a backup.
            </p>
            <a
              href="https://neon.com/docs/introduction/branching"
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white hover:bg-white/10"
            >
              Branching concepts <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-7">
            <div className="flex items-center gap-2 text-[12px] text-white/50">
              <GitBranch className="h-3.5 w-3.5 text-[#00e599]" />
              project: late-snow-12345678
            </div>
            <div className="mt-5 space-y-3">
              <BranchLine name="main" badges={["default"]} primary />
              <BranchLine name="preview/pr-482" badges={["forked"]} />
              <BranchLine name="preview/pr-489" badges={["forked"]} />
              <BranchLine name="dev/andre" badges={["forked"]} />
            </div>
            <div className="mt-6 rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-[12px] text-white/80">
              <div className="text-white/40"># Restore any branch to any second</div>
              <div className="mt-1">
                <span className="text-[#86efac]">POST</span>{" "}
                /projects/<span className="text-[#fbbf24]">{"{id}"}</span>/branches/
                <span className="text-[#fbbf24]">{"{branch}"}</span>/restore
              </div>
              <div className="mt-1 text-white/45">
                {"{ source_timestamp: \"2026-05-15T12:00:00Z\" }"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BuiltOnNeon() {
  const platforms = ["Replit", "Netlify DB", "Vercel", "Koyeb", "your platform"];
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-[1100px] px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
              Public API surface
            </div>
            <div className="mt-4 space-y-2 font-mono text-[12.5px]">
              <ApiLine method="POST" path="/projects" note="provision a Postgres" />
              <ApiLine method="POST" path="/projects/{id}/branches" note="copy-on-write fork" />
              <ApiLine method="GET" path="/projects/{id}/operations" note="watch async work" />
              <ApiLine method="POST" path="/projects/{id}/branches/{b}/restore" note="point-in-time restore" />
              <ApiLine method="GET" path="/projects/{id}/consumption" note="storage & compute usage" />
            </div>
            <div className="mt-6 rounded-lg border border-[#00e599]/20 bg-[#00e599]/[0.04] p-3 text-[12.5px] text-white/75">
              The same endpoints power this whole console. The same endpoints
              power the platforms below.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {platforms.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11.5px] text-white/70"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00e599]">
              Built on the Neon Open API
            </div>
            <h2 className="mt-2 text-[34px] font-semibold tracking-[-0.025em]">
              If Replit and Netlify can build on it, so can you.
            </h2>
            <p className="mt-3 text-white/65">
              This console is a working proof of how far the Neon Open API will
              take you. Every action &mdash; provisioning a project, forking a
              branch, restoring to a point in time, streaming metrics &mdash; is
              a REST call any agent or platform can make.
            </p>
            <p className="mt-3 text-white/65">
              That&apos;s why platforms like Replit and Netlify DB ship Postgres
              powered by Neon: the entire control plane is API-first. Curious
              what that unlocks for an AI agent or product?
            </p>
            <a
              href="https://neon.com/programs/agents"
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-1.5 rounded-md bg-[#00e599] px-4 py-2 text-[13px] font-semibold text-black hover:bg-[#00ffaa]"
            >
              Explore Neon for agents <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function ApiLine({
  method,
  path,
  note,
}: {
  method: "GET" | "POST" | "DELETE" | "PATCH";
  path: string;
  note: string;
}) {
  const color =
    method === "GET"
      ? "text-[#86efac]"
      : method === "POST"
      ? "text-[#fbbf24]"
      : method === "DELETE"
      ? "text-[#f87171]"
      : "text-[#93c5fd]";
  return (
    <div className="flex items-baseline gap-3 rounded-md border border-white/10 bg-black/40 px-3 py-2">
      <span className={`w-12 shrink-0 font-semibold ${color}`}>{method}</span>
      <span className="truncate text-white/85">{path}</span>
      <span className="ml-auto hidden text-[11.5px] text-white/45 sm:inline">
        {note}
      </span>
    </div>
  );
}

function ForkIt() {
  return (
    <section className="border-t border-white/10 bg-white/[0.02]">
      <div className="mx-auto max-w-[1100px] px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00e599]">
              Fork it, make it yours
            </div>
            <h2 className="mt-2 text-[34px] font-semibold tracking-[-0.025em]">
              Build the console <span className="text-[#00e599]">your</span> team
              actually needs.
            </h2>
            <p className="mt-3 text-white/65">
              Managing a fleet of Neon databases across customers, environments
              or tenants? Use this repo as a starting point. Strip out what you
              don&apos;t need, add the dashboards, automations, and per-tenant
              views you do.
            </p>
            <ul className="mt-5 space-y-2 text-[14px] text-white/75">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00e599]" />
                Per-tenant project lists with your own metadata
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00e599]" />
                Custom branch policies, retention, and naming
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00e599]" />
                Hook into your billing, alerting, or internal RBAC
              </li>
            </ul>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="https://github.com/andrelandgraf/neon-slop-fork"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#00e599] px-4 py-2 text-[13px] font-semibold text-black hover:bg-[#00ffaa]"
              >
                <Github className="h-3.5 w-3.5" /> Fork on GitHub
              </a>
              <a
                href="https://neon.com/docs/reference/api-reference"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white hover:bg-white/10"
              >
                Read the Neon API docs
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 font-mono text-[12.5px] leading-relaxed text-white/80">
            <div className="text-white/40"># clone & make it yours</div>
            <div className="mt-2">
              <span className="text-[#00e599]">$</span> git clone
              git@github.com:andrelandgraf/neon-slop-fork.git
            </div>
            <div>
              <span className="text-[#00e599]">$</span> cd neon-slop-fork
            </div>
            <div>
              <span className="text-[#00e599]">$</span> bun install
            </div>
            <div>
              <span className="text-[#00e599]">$</span> bun run dev
            </div>
            <div className="mt-4 text-white/40"># point at your Neon org</div>
            <div>
              <span className="text-[#fbbf24]">NEON_API_KEY</span>=
              <span className="text-white/55">napi_*****</span>
            </div>
            <div>
              <span className="text-[#fbbf24]">NEON_ORG_ID</span>=
              <span className="text-white/55">org_*****</span>
            </div>
            <div className="mt-4 text-white/40">
              # ship the console your team needs
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-[1100px] px-6 py-20 text-center">
        <h2 className="mx-auto max-w-[760px] text-[40px] font-semibold leading-[1.1] tracking-[-0.03em]">
          A clone. A demo. A starter kit.
        </h2>
        <p className="mx-auto mt-4 max-w-[640px] text-[15.5px] text-white/65">
          Run the console. See what the Neon Open API makes possible. Then
          fork it and build the dashboard your fleet of Postgres databases
          deserves.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#00e599] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#00ffaa]"
          >
            Open console <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com/andrelandgraf/neon-slop-fork"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-3 px-6 py-8 text-[12.5px] text-white/45 sm:flex-row">
        <div>Neon Clone &middot; aka. Slop Fork &middot; {new Date().getFullYear()}</div>
        <div className="flex items-center gap-4">
          <a
            href="https://neon.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white/80"
          >
            neon.com
          </a>
          <Link href="/projects" className="hover:text-white/80">
            Console
          </Link>
          <a
            href="https://github.com/andrelandgraf/neon-slop-fork"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white/80"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

function BranchLine({
  name,
  badges,
  primary,
}: {
  name: string;
  badges: string[];
  primary?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${
        primary
          ? "border-[#00e599]/30 bg-[#00e599]/5"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <GitBranch className="h-3.5 w-3.5 text-white/70" />
      <code className="text-[13px] font-mono text-white">{name}</code>
      <div className="ml-auto flex flex-wrap gap-1">
        {badges.map((b) => (
          <span
            key={b}
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
              b === "default"
                ? "bg-[#00e599]/20 text-[#00e599]"
                : "bg-white/10 text-white/70"
            }`}
          >
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}
