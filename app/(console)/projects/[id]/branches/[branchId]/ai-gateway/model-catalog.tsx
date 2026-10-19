"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

export interface CatalogModel {
  id: string;
  name: string;
  providerLabel: string;
  family: string;
  releaseDate: string | null;
  context: number | null;
  costIn: number | null;
  costOut: number | null;
  output: string[];
  capabilities: string[];
}

type Tab = "all" | "text" | "image";

function compact(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function price(n: number | null): string {
  return n === null ? "—" : `$${n}`;
}

function month(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Newest model per family, as the Console's "Latest" toggle shows. */
function latestPerFamily(models: CatalogModel[]): CatalogModel[] {
  const newest = new Map<string, CatalogModel>();
  for (const m of models) {
    const key = `${m.providerLabel}/${m.family}`;
    const current = newest.get(key);
    if (!current || (m.releaseDate ?? "") > (current.releaseDate ?? "")) newest.set(key, m);
  }
  return models.filter((m) => newest.get(`${m.providerLabel}/${m.family}`) === m);
}

export function ModelCatalog({ models }: { models: CatalogModel[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("");
  const [capability, setCapability] = useState("");
  const [latest, setLatest] = useState(true);

  const scoped = useMemo(() => (latest ? latestPerFamily(models) : models), [latest, models]);
  const counts = {
    all: scoped.length,
    text: scoped.filter((m) => m.output.includes("text")).length,
    image: scoped.filter((m) => m.output.includes("image")).length,
  };
  const providers = [...new Set(models.map((m) => m.providerLabel))].sort();
  const capabilities = ["Web search", "Image generation", "Embeddings"];
  const needle = query.trim().toLowerCase();
  const visible = scoped.filter(
    (m) =>
      (tab === "all" || m.output.includes(tab)) &&
      (!provider || m.providerLabel === provider) &&
      (!capability || m.capabilities.includes(capability)) &&
      (!needle || `${m.name} ${m.providerLabel} ${m.id}`.toLowerCase().includes(needle))
  );

  return (
    <div>
      <div className="mb-4 flex gap-5 border-panel-border border-b">
        {(
          [
            ["all", `All (${counts.all})`],
            ["text", `Text (${counts.text})`],
            ["image", `Image gen (${counts.image})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "-mb-px border-b-2 pb-2 text-sm",
              tab === value ? "border-foreground font-semibold" : "border-transparent text-muted-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mb-3 flex items-center gap-2">
        <label className="flex h-8 w-[220px] items-center gap-2 rounded-[3px] border border-panel-border px-2.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models"
            aria-label="Search models by name or provider"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <NativeSelect
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          wrapperClassName="w-[220px]"
          aria-label="Filter models by provider"
        >
          <option value="">All providers</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={capability}
          onChange={(e) => setCapability(e.target.value)}
          wrapperClassName="w-[220px]"
          aria-label="Filter models by capability"
        >
          <option value="">All capabilities</option>
          {capabilities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
        <div className="ml-auto flex rounded-[3px] border border-panel-border p-0.5 text-sm" aria-label="Model versions">
          {(
            [
              [true, "Latest"],
              [false, "All Versions"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setLatest(value)}
              className={cn("whitespace-nowrap rounded-[2px] px-2.5 py-1", latest === value && "bg-muted font-semibold")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-panel-border border-b">
            {["Model", "Provider", "Cost (in)", "Cost (out)", "Context", "Output", "Capabilities", "Release"].map(
              (h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {visible.map((m) => (
            <tr key={m.id} className="border-panel-border border-b">
              <td className="px-3 py-3 font-semibold">{m.name}</td>
              <td className="px-3 py-3">{m.providerLabel}</td>
              <td className="px-3 py-3">{price(m.costIn)}</td>
              <td className="px-3 py-3">{price(m.costOut)}</td>
              <td className="px-3 py-3">{compact(m.context)}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {m.output.map((o) => (
                    <span key={o} className="rounded-full border border-panel-border px-1.5 py-px text-xs">
                      {o}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-3">
                {m.capabilities.length === 0 ? (
                  "—"
                ) : (
                  <div className="flex flex-col items-start gap-1">
                    {m.capabilities.map((c) => (
                      <span key={c} className="rounded-full border border-panel-border px-1.5 py-px text-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-3 py-3">{month(m.releaseDate)}</td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-10 text-center">
                <div className="font-semibold">No models match your search</div>
                <div className="text-muted-foreground text-xs">
                  Try a different name, provider, capability, or clear the filters.
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
