import { redirect } from "next/navigation";
import { maybeSession } from "@/lib/tenancy";
import { AuthScreen } from "../auth/auth-screen";

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
  const githubEnabled = Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
  );
  return (
    <AuthScreen mode="login" next={next} error={error} githubEnabled={githubEnabled} />
  );
}
