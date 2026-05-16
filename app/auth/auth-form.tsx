"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";

const PROVIDERS_LOGIN = [
  { id: "google", label: "Google", icon: GoogleIcon, badge: "Last" },
  { id: "github", label: "GitHub", icon: GithubIcon },
  { id: "microsoft", label: "Microsoft", icon: MicrosoftIcon },
  { id: "hasura", label: "Hasura", icon: HasuraIcon },
] as const;

const PROVIDERS_SIGNUP = [
  { id: "google", label: "Google", icon: GoogleIcon },
  { id: "github", label: "GitHub", icon: GithubIcon },
  { id: "microsoft", label: "Microsoft", icon: MicrosoftIcon },
] as const;

export function AuthForm({
  mode,
  next,
  initialError,
}: {
  mode: "login" | "signup";
  next?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const providers = mode === "login" ? PROVIDERS_LOGIN : PROVIDERS_SIGNUP;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      if (mode === "signup") {
        const displayName = name.trim() || email.split("@")[0] || "Member";
        const res = await signUp.email({
          email: email.trim(),
          password,
          name: displayName,
        });
        if (res.error) {
          throw new Error(res.error.message ?? "Could not sign up.");
        }
      } else {
        const res = await signIn.email({ email: email.trim(), password });
        if (res.error) {
          throw new Error(res.error.message ?? "Could not sign in.");
        }
      }
      router.replace(next ?? "/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-7 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {providers.map((p) => (
          <ProviderButton
            key={p.id}
            id={p.id}
            label={p.label}
            icon={<p.icon />}
            badge={"badge" in p ? p.badge : undefined}
            disabled={p.id !== "github"}
            onClick={() => {
              if (p.id !== "github") return;
              setError(null);
              signIn.social({
                provider: "github",
                callbackURL: next ?? "/projects",
              });
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-white/35">
        <span className="h-px flex-1 bg-white/10" />
        Or {mode === "signup" ? "continue with Email" : "continue with"}
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              autoComplete="name"
              className={INPUT_CLASS}
            />
          </Field>
        )}
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={mode === "login" ? "Enter your email address" : "youremail@email.com"}
            autoComplete="email"
            className={INPUT_CLASS}
          />
        </Field>
        <Field
          label="Password"
          trailing={
            mode === "login" ? (
              <span
                className="cursor-not-allowed text-[12px] text-white/35"
                title="Password reset requires an email transport, which this clone does not configure."
              >
                Forgot Password?
              </span>
            ) : null
          }
        >
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "login" ? "Enter a unique password" : "Enter a unique password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={INPUT_CLASS + " pr-10"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/45 hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-[12px] text-red-300">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={pending || !email || !password}
          className="w-full rounded-md bg-white/[0.06] py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? mode === "signup"
              ? "Creating…"
              : "Logging in…"
            : mode === "signup"
              ? "Continue"
              : "Log in"}
        </button>
      </form>
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-[#00e599] focus:outline-none focus:ring-1 focus:ring-[#00e599]/40";

function Field({
  label,
  children,
  trailing,
}: {
  label: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-white/55">
        <span>{label}</span>
        {trailing}
      </div>
      {children}
    </label>
  );
}

function ProviderButton({
  id,
  label,
  icon,
  badge,
  disabled,
  onClick,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={
        disabled
          ? `${label} sign-in is disabled in this clone. ` +
            (id === "github"
              ? "Set GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET to enable."
              : "Not implemented.")
          : `Continue with ${label}`
      }
      className="relative inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] py-2 text-[13px] text-white/85 transition-colors hover:enabled:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className="h-4 w-4">{icon}</span>
      {label}
      {badge && (
        <span className="absolute right-2 top-1.5 rounded-full bg-[#00e599] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-black">
          {badge}
        </span>
      )}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.8h5.3c-.2 1.4-1.7 4-5.3 4-3.2 0-5.8-2.7-5.8-6s2.6-6 5.8-6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.5 3.5 14.5 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.7H12z"
      />
    </svg>
  );
}
function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.3-1.3-1.6-1.3-1.6-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.4-5.5-6 0-1.3.5-2.4 1.2-3.2 0-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.7.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A12 12 0 0 0 12 .5z" />
    </svg>
  );
}
function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
function HasuraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#1eb4d4]" fill="currentColor" aria-hidden>
      <path d="M3 2l4 4-1 5 4 4-2 7 4-4 2-7-4-4 1-5-4-4zM21 2l-4 4 1 5-4 4 2 7-4-4-2-7 4-4-1-5 4-4z" />
    </svg>
  );
}
