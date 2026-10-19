/**
 * The Console's data-masking choices, per column type, and how each becomes
 * a PostgreSQL Anonymizer rule. Copied from the Console so rules written here
 * read back identically there.
 */

export type ColumnKind =
  | "text"
  | "integer"
  | "biginteger"
  | "numeric"
  | "date"
  | "timestamp"
  | "boolean"
  | "bytea"
  | "json"
  | "uuid"
  | "array"
  | "enum"
  | "inet";

export interface MaskOption {
  value: string;
  label: string;
  description?: string;
  /** Only offered on nullable columns. */
  nullableOnly?: boolean;
}

export interface MaskGroup {
  title?: string;
  options: MaskOption[];
}

const NULL: MaskOption = { value: "$NULL", label: "Replace with NULL", nullableOnly: true };
const ZERO: MaskOption = { value: "$0", label: "Replace with Zero" };

export const MASK_OPTIONS: Record<ColumnKind, MaskGroup[]> = {
  text: [
    {
      title: "Names",
      options: [
        { value: "anon.dummy_first_name", label: "Synthetic First Name" },
        { value: "anon.dummy_last_name", label: "Synthetic Last Name" },
        { value: "anon.dummy_name", label: "Synthetic Full Name" },
      ],
    },
    {
      title: "Email Addresses",
      options: [
        {
          value: "random_unique_email",
          label: "Random Unique Email",
          description: "Generates a unique email address using UUIDs to ensure no duplicates across rows",
        },
        {
          value: "anon.dummy_safe_email",
          label: "Synthetic Safe Email",
          description: "Returns a safe, non-existent email address in the format user@example.com or similar",
        },
        {
          value: "anon.dummy_free_email",
          label: "Synthetic Free Email",
          description:
            "Returns a synthetic email address using popular free email provider domains (like Gmail, Yahoo, Outlook, etc.)",
        },
      ],
    },
    {
      title: "Phone Numbers",
      options: [
        { value: "anon.dummy_phone_number", label: "Synthetic Phone Number" },
        { value: "anon.random_phone", label: "Random Phone Number" },
      ],
    },
    {
      title: "Addresses",
      options: [
        { value: "anon.fake_address", label: "Synthetic Address" },
        { value: "anon.fake_city", label: "Synthetic City" },
        { value: "anon.fake_country", label: "Synthetic Country" },
        { value: "anon.dummy_state_abbr", label: "Synthetic State Abbreviation" },
        { value: "anon.dummy_state_name", label: "Synthetic State Name" },
        { value: "anon.dummy_street_name", label: "Synthetic Street Name" },
        { value: "anon.dummy_street_suffix", label: "Synthetic Street Suffix" },
        { value: "anon.dummy_zip_code", label: "Synthetic ZIP Code" },
        { value: "anon.dummy_post_code", label: "Synthetic Postal Code" },
        { value: "anon.dummy_company_name", label: "Synthetic Company Name" },
        { value: "anon.dummy_country_code", label: "Synthetic Country Code" },
        { value: "anon.dummy_country_name", label: "Synthetic Country Name" },
      ],
    },
    {
      title: "Other",
      options: [
        { value: "anon.lorem_ipsum", label: "Lorem Ipsum Text" },
        { value: "anon.partial", label: "Partial Scrambling" },
        { value: "anon.random_zip", label: "Random ZIP/Postal Code" },
        { value: "anon.fake_iban", label: "Synthetic IBAN" },
        { value: "anon.dummy_credit_card_number", label: "Synthetic Credit Card Number" },
        NULL,
      ],
    },
  ],
  integer: [{ options: [NULL, ZERO, { value: "anon.random_int_between", label: "Random integer from range" }] }],
  biginteger: [
    {
      options: [
        { value: "$NULL", label: "Replace with NULL" },
        ZERO,
        { value: "anon.random_bigint_between", label: "Random biginteger from range" },
      ],
    },
  ],
  numeric: [{ options: [NULL, ZERO] }],
  date: [
    {
      options: [
        NULL,
        { value: "anon.random_date", label: "Random Date" },
        { value: "anon.random_date_between", label: "Random date from range" },
      ],
    },
  ],
  timestamp: [
    {
      options: [
        NULL,
        { value: "anon.random_date", label: "Random Date" },
        { value: "anon.random_date_between", label: "Random timestamp from range" },
      ],
    },
  ],
  boolean: [{ options: [NULL, { value: "$false", label: "Replace with False" }] }],
  bytea: [{ options: [NULL] }],
  json: [{ options: [NULL, { value: "$'{}'", label: "Replace with Empty JSON Object" }] }],
  uuid: [{ options: [{ value: "gen_random_uuid", label: "Generate Random UUID" }, NULL] }],
  array: [{ options: [NULL, { value: "$'{}'", label: "Replace with Empty Array" }] }],
  enum: [{ options: [NULL] }],
  inet: [
    {
      options: [
        { value: "anon.dummy_ipv4", label: "Random IPv4 Address" },
        { value: "anon.dummy_ipv6", label: "Random IPv6 Address" },
        NULL,
      ],
    },
  ],
};

/** Maps `information_schema.columns.data_type` / `udt_name` to the Console's kinds. */
export function columnKind(dataType: string, udtName: string): ColumnKind | null {
  const t = dataType.toLowerCase();
  if (t === "array") return "array";
  if (t === "user-defined") return udtName === "citext" ? "text" : "enum";
  if (["text", "character varying", "character", "citext", "name"].includes(t)) return "text";
  if (["integer", "smallint"].includes(t)) return "integer";
  if (t === "bigint") return "biginteger";
  if (["numeric", "real", "double precision", "money"].includes(t)) return "numeric";
  if (t === "date") return "date";
  if (t.startsWith("timestamp")) return "timestamp";
  if (t === "boolean") return "boolean";
  if (t === "bytea") return "bytea";
  if (t === "json" || t === "jsonb") return "json";
  if (t === "uuid") return "uuid";
  if (t === "inet" || t === "cidr") return "inet";
  return null;
}

const UNIQUE_EMAIL = "pg_catalog.concat(anon.dummy_uuidv4(), '@example.com')";

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** The Console's default arguments for functions that take them. */
function defaultArgs(fn: string, column: string): string {
  switch (fn) {
    case "anon.lorem_ipsum":
      return "paragraphs := 2";
    case "anon.random_int_between":
      return "start := 0, stop := 100000";
    case "anon.random_bigint_between":
      return "start := 0, stop := 99999999999";
    case "anon.random_date_between":
      return `date_start := '2000-01-01T00:00:00.000Z', date_end := '${new Date().toISOString()}'`;
    case "anon.partial":
      return `${quoteIdent(column)}, 1, 'XXX', 1`;
    default:
      return "";
  }
}

export interface RuleTarget {
  database_name: string;
  schema_name: string;
  table_name: string;
  column_name: string;
}

export type RuleValue = { masking_function: string } | { masking_value: string };

/** An option value from the menu, as the API's rule fields. */
export function optionToRule(value: string, column: string): RuleValue {
  if (value.startsWith("$")) return { masking_value: value.slice(1) };
  if (value === "random_unique_email") return { masking_function: UNIQUE_EMAIL };
  return { masking_function: `${value}(${defaultArgs(value, column)})` };
}

/**
 * The menu option a stored rule corresponds to, or `null` for a custom
 * expression written via the API or SQL (shown as text and kept as is).
 */
export function ruleToOption(rule: {
  masking_function?: string;
  masking_value?: string;
}): string | null {
  if (rule.masking_value !== undefined) return `$${rule.masking_value}`;
  const fn = rule.masking_function ?? "";
  if (fn === UNIQUE_EMAIL) return "random_unique_email";
  const name = fn.match(/^([\w.]+)\(/)?.[1];
  if (!name) return null;
  const known = Object.values(MASK_OPTIONS)
    .flatMap((groups) => groups.flatMap((g) => g.options))
    .some((o) => o.value === name);
  return known ? name : null;
}

export function optionLabel(value: string): string | null {
  for (const groups of Object.values(MASK_OPTIONS)) {
    for (const group of groups) {
      const found = group.options.find((o) => o.value === value);
      if (found) return found.label;
    }
  }
  return null;
}
