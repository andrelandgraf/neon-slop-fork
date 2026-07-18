import Link from "next/link";
import { ArrowLeft, GitBranch, Code2, Zap } from "lucide-react";
import { NeonLogomark } from "@/components/neon-logo";
import { NeonAurora } from "@/components/neon-aurora";
import { AuthForm } from "./auth-form";

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to your console to manage projects, branches, and data.",
    swapPrompt: "New to Neon?",
    swapLabel: "Create an account",
    swapHref: "/signup",
  },
  signup: {
    title: "Create your free account",
    subtitle: "Spin up serverless Postgres in seconds — no credit card required.",
    swapPrompt: "Already have an account?",
    swapLabel: "Sign in",
    swapHref: "/login",
  },
} as const;

const HIGHLIGHTS = [
  { icon: Zap, label: "Serverless compute", body: "Scales to zero, wakes in milliseconds." },
  { icon: GitBranch, label: "Instant branching", body: "Copy-on-write branches of your whole database." },
  { icon: Code2, label: "Open on the public API", body: "Everything here runs on endpoints you can call too." },
];

export function AuthScreen({
  mode,
  next,
  error,
  githubEnabled,
}: {
  mode: "login" | "signup";
  next?: string;
  error?: string;
  githubEnabled: boolean;
}) {
  const copy = COPY[mode];
  const swapHref = `${copy.swapHref}${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="dark relative grid min-h-screen bg-background text-foreground antialiased lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — the live aurora, brand mark, and the pitch. */}
      <aside className="relative hidden overflow-hidden border-r border-border lg:block">
        <NeonAurora
          className="absolute inset-0"
          colors={["#0e5f45", "#00e599", "#3b82f6"]}
          density={0.32}
          intensity={1.85}
          flare={0.6}
          glare={0.28}
          speed={0.6}
        />
        {/* Legibility scrim: darken top and bottom so text sits cleanly. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/85" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-black/40" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="inline-flex w-fit items-center gap-2.5" title="Home">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-white/10 backdrop-blur">
              <NeonLogomark className="h-[18px] w-[18px] text-neon-green" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">Neon Clone</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/70">
              Slop Fork
            </span>
          </Link>

          <div className="max-w-md">
            <h2 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-white xl:text-[46px]">
              Build on Postgres.
              <br />
              <span className="bg-gradient-to-r from-neon-green to-[#38bdf8] bg-clip-text text-transparent">
                Without the wait.
              </span>
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/70">
              The Neon console, rebuilt in the open on the public API — the same
              serverless Postgres, branching, and data tools, all the way down.
            </p>

            <ul className="mt-9 flex flex-col gap-4">
              {HIGHLIGHTS.map(({ icon: Icon, label, body }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-neon-green backdrop-blur">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-[13.5px] font-medium text-white">{label}</div>
                    <div className="text-[12.5px] leading-snug text-white/55">{body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-[11px] text-white/40">
            An unofficial open clone of console.neon.tech · not affiliated with Neon
          </div>
        </div>
      </aside>

      {/* Form panel. */}
      <main className="relative flex flex-col">
        {/* Faint brand glow + dot texture behind the form. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(680px circle at 70% -10%, rgba(0,229,153,0.10), transparent 60%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 text-white/[0.04] neon-dot-grid" />

        <header className="relative flex items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          {/* Mobile brand mark (brand panel is hidden < lg). */}
          <Link href="/" className="inline-flex items-center gap-2 lg:hidden" title="Home">
            <span className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card">
              <NeonLogomark className="h-3.5 w-3.5 text-neon-green" />
            </span>
          </Link>
        </header>

        <div className="relative flex flex-1 items-center justify-center px-6 pb-10">
          <div className="w-full max-w-[380px]">
            <div className="animate-rise">
              <h1 className="text-[26px] font-semibold tracking-tight">{copy.title}</h1>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                {copy.subtitle}
              </p>
            </div>

            <AuthForm
              mode={mode}
              next={next}
              initialError={error}
              githubEnabled={githubEnabled}
            />

            {mode === "signup" && (
              <p
                className="mt-5 animate-rise text-[11px] leading-relaxed text-muted-foreground/70"
                style={{ animationDelay: "320ms" }}
              >
                By creating an account you agree to the Terms of Service and Privacy
                Policy. We&apos;ll occasionally send product news; opt out anytime.
              </p>
            )}

            <p
              className="mt-6 animate-rise text-center text-[13px] text-muted-foreground"
              style={{ animationDelay: "360ms" }}
            >
              {copy.swapPrompt}{" "}
              <Link
                href={swapHref}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {copy.swapLabel}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
