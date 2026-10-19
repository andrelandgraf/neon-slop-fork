import { defineParsers, pgTypeOids } from "@neon/realtime/client";

const BOOL_OID = pgTypeOids.bool;

function byteaText(bytes: Uint8Array): string {
  return `\\x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function asText(value: string | Uint8Array): string {
  return typeof value === "string" ? value : byteaText(value);
}

/**
 * Keeps every live value as Postgres text, the way the server reads the same
 * page, so the rendered page and its live result show identical cells.
 * Overriding an array type's own OID also stops the client decoding it
 * element by element.
 */
export const textParsers = defineParsers(
  Object.fromEntries(Object.values(pgTypeOids).map((oid) => [oid, asText]))
);

/** A cell's display text. Booleans read `t`/`f` in Postgres text. */
export function cellText(value: string | null | undefined, typeOid: number | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeOid === BOOL_OID) return value === "t" ? "true" : value === "f" ? "false" : value;
  return value;
}
