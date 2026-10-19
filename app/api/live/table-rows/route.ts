import { NeonApiError } from "@neon/sdk";
import { projectBelongsToOrg } from "@/lib/live/load";
import { sealTableRows } from "@/lib/tables/live";
import { TablePreviewNotFoundError, tablePreviewSql } from "@/lib/tables/preview";
import { isPageSize, type PreviewTarget } from "@/lib/tables/preview-sql";
import { verifyPageIdentity } from "@/lib/tenancy";

const NO_STORE = { "Cache-Control": "no-store" };

interface TableRowsParams extends PreviewTarget {
  userId: string;
  orgId: string;
  projectId: string;
  branchId: string;
  databaseName: string;
}

function parseParams(body: unknown): TableRowsParams | null {
  if (typeof body !== "object" || body === null) return null;
  const read = (key: string) => (key in body ? Reflect.get(body, key) : undefined);
  const userId = read("userId");
  const orgId = read("orgId");
  const projectId = read("projectId");
  const branchId = read("branchId");
  const databaseName = read("databaseName");
  const schema = read("schema");
  const table = read("table");
  const page = read("page");
  const pageSize = read("pageSize");
  if (
    typeof userId !== "string" ||
    typeof orgId !== "string" ||
    typeof projectId !== "string" ||
    typeof branchId !== "string" ||
    typeof databaseName !== "string" ||
    typeof schema !== "string" ||
    typeof table !== "string" ||
    typeof page !== "number" ||
    !Number.isInteger(page) ||
    page < 1 ||
    !isPageSize(pageSize)
  ) {
    return null;
  }
  return { userId, orgId, projectId, branchId, databaseName, schema, table, page, pageSize };
}

/**
 * Renews the sealed query behind a live table page. It rebuilds the SQL from
 * the catalog rather than taking it from the browser. 401 reloads the tab;
 * 403, 404 and 409 tell the page to stop renewing; 503 is retried.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const params = parseParams(body);
  if (!params) {
    return Response.json(
      {
        error:
          "Body must be { userId, orgId, projectId, branchId, databaseName, schema, table, page, pageSize } with a page of 1 or more and a page size of 10, 25, 50 or 100.",
      },
      { status: 400, headers: NO_STORE }
    );
  }
  const check = await verifyPageIdentity(params);
  if (!check.ok) return Response.json({ error: check.error }, { status: check.status, headers: NO_STORE });
  if (!(await projectBelongsToOrg(params))) {
    return Response.json({ error: "This project doesn't belong to your organization." }, { status: 403, headers: NO_STORE });
  }
  try {
    const { sql, primaryKey } = await tablePreviewSql(params.projectId, params.branchId, params.databaseName, params);
    if (primaryKey.length === 0) {
      return Response.json({ error: "This table no longer has a primary key." }, { status: 409, headers: NO_STORE });
    }
    const sealed = await sealTableRows(params.projectId, params.branchId, params.databaseName, sql);
    if (!sealed) {
      return Response.json({ error: "Realtime is being set up on this branch." }, { status: 503, headers: NO_STORE });
    }
    return Response.json(sealed, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof TablePreviewNotFoundError) {
      return Response.json({ error: error.message }, { status: 404, headers: NO_STORE });
    }
    if (error instanceof NeonApiError && error.status === 404) {
      return Response.json({ error: "Realtime is off on this branch, or the branch is gone." }, { status: 409, headers: NO_STORE });
    }
    throw error;
  }
}
