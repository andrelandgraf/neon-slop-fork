import { isLiveCollectionName, LiveParamsError, projectBelongsToOrg, sealLive, type LiveParams } from "@/lib/live/load";
import { verifyPageIdentity } from "@/lib/tenancy";

const NO_STORE = { "Cache-Control": "no-store" };

function parseParams(body: unknown): LiveParams | null {
  if (typeof body !== "object" || body === null) return null;
  const read = (key: string) => (key in body ? Reflect.get(body, key) : undefined);
  const userId = read("userId");
  const orgId = read("orgId");
  const projectId = read("projectId");
  const branchId = read("branchId");
  if (typeof userId !== "string" || typeof orgId !== "string") return null;
  if (projectId !== undefined && typeof projectId !== "string") return null;
  if (branchId !== undefined && typeof branchId !== "string") return null;
  return { userId, orgId, projectId, branchId };
}

/**
 * Renews a sealed live query. The page sends the user and org it was
 * rendered for; a different session or active org gets 401 so the tab
 * reloads instead of subscribing as someone else.
 */
export async function POST(request: Request, { params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  if (!isLiveCollectionName(collection)) {
    return Response.json({ error: `Unknown live collection: ${collection}` }, { status: 404, headers: NO_STORE });
  }
  const body: unknown = await request.json().catch(() => null);
  const live = parseParams(body);
  if (!live) {
    return Response.json(
      { error: "Body must be { userId, orgId, projectId?, branchId? } with string values." },
      { status: 400, headers: NO_STORE }
    );
  }
  const check = await verifyPageIdentity(live);
  if (!check.ok) return Response.json({ error: check.error }, { status: check.status, headers: NO_STORE });
  if (!(await projectBelongsToOrg(live))) {
    return Response.json({ error: "This project doesn't belong to your organization." }, { status: 403, headers: NO_STORE });
  }
  try {
    return Response.json(await sealLive(collection, live), { headers: NO_STORE });
  } catch (error) {
    if (error instanceof LiveParamsError) return Response.json({ error: error.message }, { status: 400, headers: NO_STORE });
    throw error;
  }
}
