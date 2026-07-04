"use client";

import { useState } from "react";
import { Plus, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NIGERIA_STATES, getLGAsForState } from "@/lib/nigeria-regions";
import type { JobRegion } from "@/types";

interface NigeriaRegionSelectorProps {
  value: JobRegion[];
  onChange: (regions: JobRegion[]) => void;
}

const selectClass =
  "h-9 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-1 text-[var(--color-foreground)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

/** A single row: State dropdown + LGA dropdown */
function RegionRow({
  index,
  region,
  onUpdate,
  onRemove,
}: {
  index: number;
  region: Partial<JobRegion>;
  onUpdate: (index: number, updated: Partial<JobRegion>) => void;
  onRemove: (index: number) => void;
}) {
  const lgas = region.state ? getLGAsForState(region.state) : [];

  return (
    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
      {/* State */}
      <div className="flex-1 min-w-[160px]">
        <select
          id={`region-state-${index}`}
          value={region.state ?? ""}
          onChange={(e) =>
            onUpdate(index, { state: e.target.value, lga: "" })
          }
          className={selectClass}
        >
          <option value="">Select State…</option>
          {NIGERIA_STATES.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* LGA */}
      <div className="flex-1 min-w-[160px]">
        <select
          id={`region-lga-${index}`}
          value={region.lga ?? ""}
          disabled={!region.state}
          onChange={(e) =>
            onUpdate(index, { ...region, lga: e.target.value })
          }
          className={selectClass}
        >
          <option value="">
            {region.state ? "Select LGA…" : "— Select state first —"}
          </option>
          {lgas.map((lga) => (
            <option key={lga} value={lga}>
              {lga}
            </option>
          ))}
        </select>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        title="Remove region"
        className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function NigeriaRegionSelector({
  value,
  onChange,
}: NigeriaRegionSelectorProps) {
  // Draft rows (may be incomplete — no lga yet)
  const [rows, setRows] = useState<Partial<JobRegion>[]>(
    value.length > 0 ? value : []
  );

  function addRow() {
    const next = [...rows, { state: "", lga: "" }];
    setRows(next);
    // Don't push incomplete rows to parent
  }

  function updateRow(index: number, updated: Partial<JobRegion>) {
    const next = rows.map((r, i) => (i === index ? updated : r));
    setRows(next);
    // Propagate only fully filled rows
    onChange(next.filter((r): r is JobRegion => !!r.state && !!r.lga));
  }

  function removeRow(index: number) {
    const next = rows.filter((_, i) => i !== index);
    setRows(next);
    onChange(next.filter((r): r is JobRegion => !!r.state && !!r.lga));
  }

  // Confirmed regions (both state + lga filled)
  const confirmed = value;

  return (
    <div className="space-y-3">
      {/* Column headers */}
      {rows.length > 0 && (
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <span className="flex-1 min-w-[160px] text-xs font-medium text-[var(--color-muted-foreground)] px-1">
            State
          </span>
          <span className="flex-1 min-w-[160px] text-xs font-medium text-[var(--color-muted-foreground)] px-1">
            Local Government Area (LGA)
          </span>
          <span className="w-8" />
        </div>
      )}

      {/* Rows */}
      <div className="space-y-2">
        {rows.map((row, i) => (
          <RegionRow
            key={i}
            index={i}
            region={row}
            onUpdate={updateRow}
            onRemove={removeRow}
          />
        ))}
      </div>

      {/* Add button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="gap-1.5"
      >
        <Plus size={13} />
        Add Region
      </Button>

      {/* Confirmed region badges */}
      {confirmed.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {confirmed.map((r, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: "var(--color-brand-light)",
                color: "var(--color-brand)",
              }}
            >
              <MapPin size={10} />
              {r.state} — {r.lga}
              <button
                type="button"
                onClick={() => removeRow(rows.findIndex((row, idx) => row.state === r.state && row.lga === r.lga && idx >= i))}
                className="hover:opacity-70 cursor-pointer"
                title={`Remove ${r.state} — ${r.lga}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Helper text */}
      {rows.length === 0 && confirmed.length === 0 && (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          No regions added yet. Click &ldquo;Add Region&rdquo; to specify where this job is available.
        </p>
      )}
    </div>
  );
}
