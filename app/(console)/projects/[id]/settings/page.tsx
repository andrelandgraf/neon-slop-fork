import { SettingsRedirect } from "./settings-redirect";

/**
 * `/projects/P/settings` used to be one long page with anchors; old links
 * like `#networking` land on the matching sub-page.
 */
export default async function SettingsIndex({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { id } = await params;
  const { branch } = await searchParams;
  return <SettingsRedirect projectId={id} branch={branch} />;
}
