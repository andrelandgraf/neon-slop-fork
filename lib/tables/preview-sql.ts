export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export function isPageSize(value: unknown): value is PageSize {
  return PAGE_SIZES.some((size) => size === value);
}

/** One page of one table, as the Tables page addresses it. */
export interface PreviewTarget {
  schema: string;
  table: string;
  page: number;
  pageSize: PageSize;
}

/** Every value of a preview row is Postgres text, or null. */
export type TableRow = Record<string, string | null>;

export function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

/**
 * The page's SQL. Ordered by the primary key when there is one, so pages are
 * stable and the live query returns the same rows the server rendered. The
 * string is sealed for Realtime as is, so it must stay one statement with no
 * trailing semicolon.
 */
export function previewSql(target: PreviewTarget, primaryKey: readonly string[]): string {
  const from = `${quoteIdent(target.schema)}.${quoteIdent(target.table)}`;
  const order = primaryKey.length > 0 ? ` ORDER BY ${primaryKey.map(quoteIdent).join(", ")}` : "";
  const offset = (target.page - 1) * target.pageSize;
  return `SELECT * FROM ${from}${order} LIMIT ${target.pageSize} OFFSET ${offset}`;
}

export function rowKey(row: TableRow, primaryKey: readonly string[]): string {
  return JSON.stringify(primaryKey.map((column) => row[column] ?? null));
}
