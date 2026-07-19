import Link from "next/link";
import { ArrowRight, ArrowUpRight, Github } from "lucide-react";
import { NeonLogomark } from "@/components/neon-logo";
import { NeonAurora } from "@/components/neon-aurora";

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
      <SlopForkIntro />
      <WhyStory />
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
      {/* Live aurora field, faded into the page on every edge. */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(120%_80%_at_50%_0%,black,transparent_72%)]">
        <NeonAurora
          className="absolute inset-0 opacity-70"
          density={0.28}
          intensity={1.6}
          flare={0.55}
          glare={0.22}
          speed={0.5}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
      <div className="relative mx-auto max-w-[1100px] px-6 pt-24 pb-24 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] text-white/70 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00e599] neon-status-breathe" />
          Open clone · built on the public Neon API
        </div>
        <h1 className="mx-auto max-w-[920px] text-[56px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[68px]">
          The Neon console,{" "}
          <span className="bg-gradient-to-r from-[#00e599] to-[#38bdf8] bg-clip-text text-transparent">
            forked
          </span>{" "}
          &mdash; built in public, on the public API.
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

function SlopForkIntro() {
  return (
    <section className="relative border-t border-white/10">
      <div className="mx-auto max-w-[760px] px-6 pt-20 pb-16">
        <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.03em] md:text-[48px]">
          Neon Slop Fork
        </h2>

        <figure className="mt-8 border-l-2 border-[#00e599]/60 pl-5">
          <div className="flex items-baseline gap-3">
            <span className="text-[19px] font-semibold">slopfork</span>
            <span className="text-[14px] italic text-white/50">
              /ˈslɑpˌfɔrk/
            </span>
          </div>
          <p className="mt-2 text-[16px] leading-[1.65] text-white/70">
            &mdash; A hastily produced software clone that imitates the surface
            features, design language, or &ldquo;vibe&rdquo; of an existing
            product while lacking architectural rigor, security hardening, or
            production readiness.
          </p>
          <figcaption className="mt-3 text-[13px] text-white/40">
            &mdash; slopfork.dev
          </figcaption>
        </figure>

        <p className="mt-10 text-[17px] leading-[1.7] text-white/75">
          This is exactly that: a faithful clone of the Neon console, rebuilt
          from scratch on top of the{" "}
          <a
            href="https://neon.com/docs/reference/api-reference"
            target="_blank"
            rel="noreferrer"
            className="text-[#00e599] underline decoration-white/20 underline-offset-4 hover:decoration-[#00e599]"
          >
            Neon Open REST API
          </a>
          . No private backend, no special access &mdash; every project,
          branch, compute control and SQL query you see here runs through the
          same public endpoints any developer, agent, or platform can call.
        </p>

        <a
          href="https://neon.com/blog/slop-fork-neon"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#00e599] hover:text-[#00ffaa]"
        >
          Read the story: &ldquo;I Slop Forked Neon. You Should Too.&rdquo;
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

function WhyStory() {
  return (
    <section className="border-t border-white/10 bg-white/[0.02]">
      <div className="mx-auto max-w-[760px] px-6 py-20">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00e599]">
          In the agentic era, APIs are the product
        </div>

        <div className="mt-6 space-y-6 text-[17px] leading-[1.75] text-white/75">
          <p>
            Agents are changing how we build software. They&rsquo;re far better
            at using APIs, CLIs, and MCP servers than they are at clicking
            through a dashboard &mdash; give an agent an API key and it can
            provision resources, inspect state, and manage infrastructure on its
            own, no UI to drive.
          </p>
          <p>
            So the best developer platforms are becoming agent-native, exposing
            everything through open surfaces. That&rsquo;s the bet Neon makes:
            if you can do it in the console, there&rsquo;s an endpoint for it
            too. This fork is the proof &mdash; the whole console, rebuilt on
            nothing but the public API.
          </p>
          <p>
            It&rsquo;s also why Neon works as infrastructure{" "}
            <span className="text-white">behind</span> other products.{" "}
            <a
              href="https://vercel.com/docs/storage/vercel-postgres"
              target="_blank"
              rel="noreferrer"
              className="text-[#00e599] underline decoration-white/20 underline-offset-4 hover:decoration-[#00e599]"
            >
              Vercel
            </a>
            ,{" "}
            <a
              href="https://www.netlify.com/products/database/"
              target="_blank"
              rel="noreferrer"
              className="text-[#00e599] underline decoration-white/20 underline-offset-4 hover:decoration-[#00e599]"
            >
              Netlify DB
            </a>
            , Replit, and Laravel Cloud all manage fleets of Neon databases
            through the same APIs you have access to. If they can build a
            platform on top of Neon, so can you.
          </p>
          <p>
            That&rsquo;s the real reason to slop fork. It&rsquo;s a fast way to
            prototype product ideas &mdash; new layouts, workflows, resource
            experiences &mdash; and an even better starting point for your own
            console: tighter integrations with your tooling, custom
            observability, AI-native workflows, or a completely different UX for
            your team. Fork it and build the dashboard your Postgres fleet
            actually deserves.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#00e599] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#00ffaa]"
          >
            Open the console <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com/andrelandgraf/neon-slop-fork"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            <Github className="h-4 w-4" /> Fork it on GitHub
          </a>
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
