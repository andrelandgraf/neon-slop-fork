"use client";

import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TableRow } from "@/lib/tables/preview-sql";

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

/**
 * Exports the currently loaded page. The public API supports query execution,
 * not the Console's asynchronous full-table export job, so this deliberately
 * names the scope instead of implying it downloaded rows the browser has not
 * loaded.
 */
export function TablePreviewActions({
  columns,
  rows,
  showRefresh,
}: {
  columns: string[];
  rows: readonly TableRow[];
  showRefresh: boolean;
}) {
  function exportCurrentPage() {
    const csv = [
      columns.map(csvCell).join(","),
      ...rows.map((row) =>
        columns.map((column) => csvCell(row[column] ?? "")).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "neon-table-page.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2">
      {showRefresh && (
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh rows
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={exportCurrentPage}
        disabled={rows.length === 0}
      >
        <Download className="h-3.5 w-3.5" />
        Export page
      </Button>
    </div>
  );
}
