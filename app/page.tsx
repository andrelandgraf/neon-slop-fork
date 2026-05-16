import Link from "next/link";
import { ArrowRight, GitBranch, Database, Zap, Activity, Terminal, Shield } from "lucide-react";

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
      <Features />
      <Branching />
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
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 text-[#00e599]"
              fill="currentColor"
            >
              <path d="M3 3h7l11 18h-7L3 3z" />
            </svg>
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
          A community clone of console.neon.tech
        </div>
        <h1 className="mx-auto max-w-[920px] text-[56px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[68px]">
          The Neon console, <span className="text-[#00e599]">forked</span> &mdash;
          built in public, on the public API.
        </h1>
        <p className="mx-auto mt-6 max-w-[720px] text-[17px] leading-[1.6] text-white/70">
          Projects. Branches. Monitoring. SQL editor. Tables. Settings. Everything you
          use Neon for, rebuilt on top of the same public REST API any agent or app
          can call. No backdoors, no special access &mdash; just a clean console.
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

function CallToAction() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-[1100px] px-6 py-20 text-center">
        <h2 className="mx-auto max-w-[760px] text-[40px] font-semibold leading-[1.1] tracking-[-0.03em]">
          Same console you know. Open all the way down.
        </h2>
        <p className="mx-auto mt-4 max-w-[640px] text-[15.5px] text-white/65">
          A faithful, open clone of console.neon.tech, built on the public
          Neon REST API. No accounts, no billing — just the console as it
          would look if every byte of it shipped under MIT.
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
