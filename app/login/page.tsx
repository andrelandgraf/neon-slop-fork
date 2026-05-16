import Link from "next/link";
import { redirect } from "next/navigation";
import { maybeSession } from "@/lib/tenancy";
import { AuthForm } from "../auth/auth-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const session = await maybeSession();
  const { next, error } = await searchParams;
  if (session) {
    redirect(next ?? "/projects");
  }
  return (
    <AuthScreen
      title="Log in to Neon"
      mode="login"
      next={next}
      error={error}
      footer={
        <>
          New to Neon?{" "}
          <Link
            href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-[#00e599] hover:underline"
          >
            Sign up for an account
          </Link>
        </>
      }
    />
  );
}

function AuthScreen({
  title,
  mode,
  next,
  error,
  footer,
}: {
  title: string;
  mode: "login" | "signup";
  next?: string;
  error?: string;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-black text-white antialiased lg:grid-cols-[480px_1fr]">
      <aside
        className="relative hidden flex-col items-center justify-center overflow-hidden border-r border-white/10 lg:flex"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(0,229,153,0.12), transparent 55%), radial-gradient(circle at 80% 80%, rgba(255,128,0,0.10), transparent 60%), #0a0c0e",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        />
        <Link href="/" className="relative mb-5 inline-flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]" title="Home">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#00e599]" fill="currentColor">
            <path d="M3 3h7l11 18h-7L3 3z" />
          </svg>
        </Link>
        <p className="relative max-w-[260px] text-center text-[18px] leading-tight text-white/85">
          Build on Postgres without slowing down.
        </p>
      </aside>
      <main className="flex flex-col">
        <header className="flex items-center px-6 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
          >
            <span aria-hidden>←</span> Home
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-[360px]">
            <h1 className="text-center text-[26px] font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-1 text-center text-[13px] text-white/55">
              {mode === "login" ? "Connect to Neon with:" : "Sign up to Neon with:"}
            </p>
            <AuthForm mode={mode} next={next} initialError={error} />
            <div className="mt-6 text-center text-[13px] text-white/65">
              {footer}
            </div>
          </div>
        </div>
        <footer className="px-6 py-6 text-center text-[11px] text-white/30">
          Neon Clone &middot; an unofficial open clone of console.neon.tech
        </footer>
      </main>
    </div>
  );
}
