/**
 * Split a SQL script into individual statements.
 *
 * Pure parser — knows about:
 *   - single- and double-quoted strings (incl. doubled-quote escapes)
 *   - dollar-quoted strings (`$tag$ ... $tag$`)
 *   - line comments (`-- ...`)
 *   - block comments (`/* ... *​/`)
 *
 * Trailing semicolons are stripped; empty statements are dropped.
 *
 * Extracted from `lib/sql.ts` so it can be exercised by unit tests
 * without dragging in the Neon control-plane client (which would
 * require `NEON_API_KEY` at module init).
 */
export function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  let i = 0;
  const n = sql.length;
  type Quote = "'" | '"' | { dollar: string };
  let quote: Quote | null = null;

  while (i < n) {
    const c = sql[i];
    const c2 = sql[i + 1];

    if (quote === null) {
      // Line comment
      if (c === "-" && c2 === "-") {
        const nl = sql.indexOf("\n", i);
        const end = nl === -1 ? n : nl;
        buf += sql.slice(i, end);
        i = end;
        continue;
      }
      // Block comment
      if (c === "/" && c2 === "*") {
        const close = sql.indexOf("*/", i + 2);
        const end = close === -1 ? n : close + 2;
        buf += sql.slice(i, end);
        i = end;
        continue;
      }
      // Dollar-quoted string $tag$...$tag$
      if (c === "$") {
        const tagMatch = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
        if (tagMatch) {
          const tag = tagMatch[0];
          quote = { dollar: tag };
          buf += tag;
          i += tag.length;
          continue;
        }
      }
      if (c === "'" || c === '"') {
        quote = c;
        buf += c;
        i++;
        continue;
      }
      if (c === ";") {
        const trimmed = buf.trim();
        if (trimmed.length > 0) out.push(trimmed);
        buf = "";
        i++;
        continue;
      }
      buf += c;
      i++;
      continue;
    }

    // Inside a quote
    if (typeof quote === "string") {
      if (c === quote && c2 === quote) {
        // Escaped quote ('' or "")
        buf += c + c2;
        i += 2;
        continue;
      }
      if (c === quote) {
        buf += c;
        quote = null;
        i++;
        continue;
      }
      buf += c;
      i++;
      continue;
    }

    // Dollar-quoted
    if (c === "$") {
      const rest = sql.slice(i);
      if (rest.startsWith(quote.dollar)) {
        buf += quote.dollar;
        i += quote.dollar.length;
        quote = null;
        continue;
      }
    }
    buf += c;
    i++;
  }

  const tail = buf.trim();
  if (tail.length > 0) out.push(tail);
  return out;
}
