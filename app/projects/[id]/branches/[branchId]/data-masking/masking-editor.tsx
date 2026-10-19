"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, CircleAlert, Loader2, Search, Table2, Layers } from "lucide-react";
import { toast } from "sonner";
import type { MaskingRule } from "@neon/sdk";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageBody, PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import {
  MASK_OPTIONS,
  optionLabel,
  optionToRule,
  ruleToOption,
  type ColumnKind,
} from "@/lib/masking/options";
import { applyMaskingRulesAction } from "@/lib/masking/actions";

export interface MaskColumn {
  database: string;
  schema: string;
  table: string;
  name: string;
  type: string;
  kind: ColumnKind | null;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey: boolean;
}

const BUSY = new Set(["created", "anonymizing"]);
const STATE_MESSAGE: Record<string, string> = {
  created: "Data masking is in created state.",
  initialized: "Ready to anonymize. Set masking rules, then apply them.",
  initialization_error: "Setting up data masking failed.",
  anonymizing: "Anonymizing data. The branch is unavailable for connections until this finishes.",
  anonymized: "Data has been anonymized.",
  error: "Anonymization failed.",
};

const key = (c: { database: string; schema: string; table: string; name: string }) =>
  `${c.database}.${c.schema}.${c.table}.${c.name}`;

export function MaskingEditor({
  projectId,
  branchId,
  state,
  statusMessage,
  columns,
  rules,
  project,
  branch,
}: {
  projectId: string;
  branchId: string;
  project: { id: string; name: string };
  branch: { name: string; default: boolean };
  state: string;
  statusMessage?: string;
  columns: MaskColumn[];
  rules: MaskingRule[];
}) {
  const router = useRouter();
  const initial = useMemo(() => {
    const map = new Map<string, MaskingRule>();
    for (const r of rules) {
      map.set(key({ database: r.database_name, schema: r.schema_name, table: r.table_name, name: r.column_name }), r);
    }
    return map;
  }, [rules]);
  const [draft, setDraft] = useState(initial);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(() => new Set(["public"]));
  const [pending, startTransition] = useTransition();
  const busy = BUSY.has(state);

  // Neon runs setup and anonymization asynchronously; poll until it settles.
  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [busy, router]);

  const dirty =
    draft.size !== initial.size ||
    [...draft].some(([k, r]) => JSON.stringify(initial.get(k)) !== JSON.stringify(r));
  const needle = query.trim().toLowerCase();
  const visible = columns.filter(
    (c) => !needle || `${c.schema}.${c.table}.${c.name}`.toLowerCase().includes(needle)
  );
  const schemas = [...new Set(visible.map((c) => c.schema))];

  function setRule(column: MaskColumn, value: string) {
    const next = new Map(draft);
    if (value === "") next.delete(key(column));
    else
      next.set(key(column), {
        database_name: column.database,
        schema_name: column.schema,
        table_name: column.table,
        column_name: column.name,
        ...optionToRule(value, column.name),
      });
    setDraft(next);
  }

  function toggle(id: string) {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpen(next);
  }

  function apply() {
    startTransition(async () => {
      const result = await applyMaskingRulesAction(projectId, branchId, [...draft.values()]);
      if (result.ok) toast.success("Anonymization started");
      else toast.error(result.error);
    });
  }

  const error = state === "error" || state === "initialization_error";

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-center gap-2 border-panel-border border-b px-6 py-2 text-sm",
          error ? "bg-destructive/10 text-destructive" : "bg-link/5"
        )}
      >
        {busy && <Loader2 className="size-3.5 animate-spin" />}
        {error && <CircleAlert className="size-3.5" />}
        {STATE_MESSAGE[state] ?? `Data masking is in ${state} state.`}
        {statusMessage && error && <span className="text-xs">{statusMessage}</span>}
      </div>
      <PageBody>
      <PageHeader
        title={
          <>
            Data masking <Badge className="bg-primary/20 text-foreground">Beta</Badge>
          </>
        }
        project={project}
        branch={branch}
        description={
          <>
            Define or edit masking rules for this branch. Apply to anonymize data.{" "}
            <a
              className="text-link"
              href="https://neon.com/docs/workflows/data-anonymization"
              target="_blank"
              rel="noreferrer"
            >
              Learn more
            </a>
          </>
        }
        actions={
          <Button onClick={apply} disabled={pending || busy || (!dirty && state !== "initialized")}>
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            Apply masking rules
          </Button>
        }
      />
      <label className="mb-3 flex h-8 items-center gap-2 rounded-[3px] border border-panel-border px-2.5">
        <Search className="size-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search columns to anonymize"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      {columns.length === 0 && (
        <p className="py-8 text-center text-muted-foreground text-sm">
          {state === "anonymizing"
            ? "The schema is shown again once anonymization finishes."
            : "This branch has no tables to mask."}
        </p>
      )}
      <div className="space-y-1 text-sm">
        {schemas.map((schema) => {
          const schemaOpen = open.has(schema) || needle !== "";
          const tables = [...new Set(visible.filter((c) => c.schema === schema).map((c) => c.table))];
          return (
            <div key={schema}>
              <TreeRow open={schemaOpen} onClick={() => toggle(schema)} icon={Layers} label={schema} />
              {schemaOpen &&
                tables.map((table) => {
                  const tableId = `${schema}.${table}`;
                  const tableOpen = open.has(tableId) || needle !== "";
                  return (
                    <div key={tableId} className="pl-5">
                      <TreeRow open={tableOpen} onClick={() => toggle(tableId)} icon={Table2} label={table} />
                      {tableOpen && (
                        <ColumnTable
                          columns={visible.filter((c) => c.schema === schema && c.table === table)}
                          draft={draft}
                          onChange={setRule}
                          disabled={state === "anonymizing"}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
      </PageBody>
    </>
  );
}

function TreeRow({
  open,
  onClick,
  icon: Icon,
  label,
}: {
  open: boolean;
  onClick: () => void;
  icon: typeof Table2;
  label: string;
}) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1.5 py-1">
      {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      <Icon className="size-3.5 text-muted-foreground" />
      {label}
    </button>
  );
}

function ColumnTable({
  columns,
  draft,
  onChange,
  disabled,
}: {
  columns: MaskColumn[];
  draft: Map<string, MaskingRule>;
  onChange: (column: MaskColumn, value: string) => void;
  disabled: boolean;
}) {
  return (
    <table className="mb-3 ml-6 w-[calc(100%-1.5rem)]">
      <thead className="text-left">
        <tr className="border-panel-border border-b">
          <th className="px-3 py-2 font-semibold">Name</th>
          <th className="px-3 py-2 font-semibold">Type</th>
          <th className="w-[280px] px-3 py-2 font-semibold">Masking</th>
        </tr>
      </thead>
      <tbody>
        {columns.map((column) => {
          const rule = draft.get(key(column));
          const selected = rule ? ruleToOption(rule) : "";
          const groups = column.kind ? MASK_OPTIONS[column.kind] : [];
          return (
            <tr key={column.name} className="border-panel-border border-b">
              <td className="px-3 py-2">
                <span className="flex items-center gap-1.5">
                  {column.name}
                  {column.primaryKey && <Badge variant="secondary">Primary Key</Badge>}
                  {column.foreignKey && <Badge variant="secondary">Foreign Key</Badge>}
                  {column.nullable && !column.primaryKey && <Badge variant="secondary">Nullable</Badge>}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{column.type}</td>
              <td className="px-3 py-2">
                {column.foreignKey ? (
                  <span className="text-muted-foreground text-xs">
                    Foreign keys follow their primary key column.
                  </span>
                ) : selected === null && rule ? (
                  <code className="block truncate font-mono text-xs" title="Custom rule set via the API or SQL">
                    {"masking_function" in rule ? rule.masking_function : rule.masking_value}
                  </code>
                ) : groups.length === 0 ? (
                  <span className="text-muted-foreground text-xs">
                    No masking functions available for this data type
                  </span>
                ) : (
                  <select
                    value={selected ?? ""}
                    disabled={disabled}
                    onChange={(e) => onChange(column, e.target.value)}
                    aria-label={`Masking for ${column.name}`}
                    className="h-8 w-full rounded-[3px] border border-panel-border bg-panel px-2 text-sm"
                  >
                    <option value="">None</option>
                    {groups.map((group, i) => {
                      const options = group.options.filter((o) => !o.nullableOnly || column.nullable);
                      return group.title ? (
                        <optgroup key={group.title} label={group.title}>
                          {options.map((o) => (
                            <option key={o.value} value={o.value} title={o.description}>
                              {o.label}
                            </option>
                          ))}
                        </optgroup>
                      ) : (
                        options.map((o) => (
                          <option key={`${i}-${o.value}`} value={o.value}>
                            {optionLabel(o.value) ?? o.label}
                          </option>
                        ))
                      );
                    })}
                  </select>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
