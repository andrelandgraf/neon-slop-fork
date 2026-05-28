import Link from "next/link";
import {
  ArrowRight,
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
        <h1 className="mx-auto max-w-[920px] text-[56px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[68px]">
          The Neon console, <span className="text-[#00e599]">forked</span> &mdash;
          built in public, on the public API.
        </h1>
        <p className="mx-auto mt-6 max-w-[720px] text-[17px] leading-[1.6] text-white/70">
          A demo of how far the Neon Open API takes you. Projects, branches,
          monitoring, SQL editor, tables and settings &mdash; all rebuilt on the
          same REST API any agent, platform or app can call.
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
