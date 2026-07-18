"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { signIn, signUp } from "@/lib/auth-client";

const PROVIDERS_LOGIN = [
  { id: "google", label: "Google", icon: GoogleIcon },
  { id: "github", label: "GitHub", icon: GithubIcon },
  { id: "microsoft", label: "Microsoft", icon: MicrosoftIcon },
  { id: "hasura", label: "Hasura", icon: HasuraIcon },
] as const;

const PROVIDERS_SIGNUP = [
  { id: "google", label: "Google", icon: GoogleIcon },
  { id: "github", label: "GitHub", icon: GithubIcon },
  { id: "microsoft", label: "Microsoft", icon: MicrosoftIcon },
] as const;

const EMAIL_SHAPE = /^\S+@\S+\.\S+$/u;

type Strength = { label: string; ratio: number; tone: "weak" | "fair" | "strong" };

function scorePassword(value: string): Strength | null {
  if (!value) return null;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/u.test(value) && /[A-Z]/u.test(value)) score += 1;
  if (/\d/u.test(value)) score += 1;
  if (/[^a-zA-Z0-9]/u.test(value)) score += 1;
  const tone = score >= 4 ? "strong" : score >= 2 ? "fair" : "weak";
  return { label: tone, ratio: tone === "strong" ? 1 : Math.max(score / 5, 0.16), tone };
}

export function AuthForm({
  mode,
  next,
  initialError,
  githubEnabled,
}: {
  mode: "login" | "signup";
  next?: string;
  initialError?: string;
  /**
   * Server-resolved: whether `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`
   * are configured. GitHub OAuth Apps can't be provisioned through the
   * CLI, so the button stays off until the env vars are set by hand.
   */
  githubEnabled: boolean;
}) {
  const router = useRouter();
  const signup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const providers = signup ? PROVIDERS_SIGNUP : PROVIDERS_LOGIN;

  const emailValid = EMAIL_SHAPE.test(email);
  const meter = useMemo(() => (signup ? scorePassword(password) : null), [signup, password]);
  const charged = emailValid && password.length >= (signup ? 8 : 1);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      if (signup) {
        const displayName = name.trim() || email.split("@")[0] || "Member";
        const res = await signUp.email({ email: email.trim(), password, name: displayName });
        if (res.error) throw new Error(res.error.message ?? "Could not sign up.");
      } else {
        const res = await signIn.email({ email: email.trim(), password });
        if (res.error) throw new Error(res.error.message ?? "Could not sign in.");
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
    <div className="mt-8 flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2">
        {providers.map((p, i) => {
          const disabled = p.id !== "github" || !githubEnabled;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              style={{ animationDelay: `${i * 40}ms` }}
              title={
                p.id === "github" && !githubEnabled
                  ? "GitHub sign-in needs GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET. Create an OAuth App at github.com/settings/applications/new and add the values to your env."
                  : disabled
                    ? `${p.label} sign-in isn’t configured in this clone.`
                    : `Continue with ${p.label}`
              }
              onClick={() => {
                if (disabled) return;
                setError(null);
                signIn.social({ provider: "github", callbackURL: next ?? "/projects" });
              }}
              className="group inline-flex animate-rise items-center justify-center gap-2 rounded-md border border-border bg-card/40 py-2.5 text-[13px] font-medium text-foreground/85 transition-all hover:enabled:-translate-y-px hover:enabled:border-primary/40 hover:enabled:bg-card hover:enabled:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="h-4 w-4">
                <p.icon />
              </span>
              {p.label}
            </button>
          );
        })}
      </div>

      <div
        className="flex animate-rise items-center gap-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60"
        style={{ animationDelay: "120ms" }}
      >
        <span className="h-px flex-1 bg-border" />
        or continue with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {signup && (
          <Field label="Name" delay={160}>
            <BeamInput
              value={name}
              onChange={(v) => setName(v)}
              placeholder="Ada Lovelace"
              autoComplete="name"
            />
          </Field>
        )}
        <Field label="Email" delay={signup ? 200 : 160} valid={touched.email && emailValid}>
          <BeamInput
            type="email"
            required
            value={email}
            onChange={(v) => setEmail(v)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="you@example.com"
            autoComplete="email"
            valid={touched.email && emailValid}
          />
        </Field>
        <Field
          label="Password"
          delay={signup ? 240 : 200}
          trailing={
            signup ? (
              meter ? (
                <span
                  className={cn(
                    "font-mono text-[11px] lowercase",
                    meter.tone === "strong"
                      ? "text-primary"
                      : meter.tone === "fair"
                        ? "text-muted-foreground"
                        : "text-destructive"
                  )}
                >
                  {meter.label}
                </span>
              ) : null
            ) : (
              <span
                className="cursor-not-allowed text-[12px] text-muted-foreground/50"
                title="Password reset requires an email transport, which this clone does not configure."
              >
                Forgot password?
              </span>
            )
          }
        >
          <div className="relative">
            <BeamInput
              type={showPassword ? "text" : "password"}
              required
              minLength={signup ? 8 : undefined}
              value={password}
              onChange={(v) => setPassword(v)}
              placeholder={signup ? "At least 8 characters" : "Enter your password"}
              autoComplete={signup ? "new-password" : "current-password"}
              className="pr-10"
              meterRatio={meter?.ratio}
              meterTone={meter?.tone}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 p-1 text-muted-foreground/60 transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {error && (
          <div className="animate-fade-in rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{ animationDelay: "280ms" }}
          className={cn(
            "inline-flex w-full animate-rise items-center justify-center gap-2 rounded-md py-2.5 text-[14px] font-semibold transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed",
            charged || pending
              ? "bg-primary text-primary-foreground shadow-[0_0_24px_-6px_hsl(var(--primary))] hover:shadow-[0_0_34px_-6px_hsl(var(--primary))]"
              : "border border-border bg-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          <span className={cn(pending && "neon-shimmer")}>
            {pending
              ? signup
                ? "Creating account…"
                : "Signing in…"
              : signup
                ? "Create account"
                : "Sign in"}
          </span>
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  trailing,
  delay = 0,
}: {
  label: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  valid?: boolean;
  delay?: number;
}) {
  return (
    <label className="block animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {trailing}
      </div>
      {children}
    </label>
  );
}

function BeamInput({
  value,
  onChange,
  onBlur,
  className,
  valid,
  meterRatio,
  meterTone,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  valid?: boolean;
  meterRatio?: number;
  meterTone?: "weak" | "fair" | "strong";
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "onBlur">) {
  const beamColor =
    meterTone === "weak"
      ? "hsl(var(--destructive))"
      : meterTone === "fair"
        ? "hsl(var(--muted-foreground))"
        : "hsl(var(--primary))";
  return (
    <span className="group relative block">
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          "w-full rounded-md border border-border bg-card/40 px-3 py-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 hover:border-border focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
          valid && "pr-9",
          className
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "neon-beam pointer-events-none absolute inset-x-[1px] bottom-0 h-[2px] origin-left rounded-full",
          meterRatio === undefined && "scale-x-0 bg-primary group-focus-within:scale-x-100"
        )}
        style={
          meterRatio !== undefined
            ? { transform: `scaleX(${meterRatio})`, backgroundColor: beamColor }
            : undefined
        }
      />
      {valid && (
        <Check className="neon-check-draw pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
      )}
    </span>
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
