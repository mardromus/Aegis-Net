"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { useApi, type DossierRow } from "@/lib/api";
import { cn, trustClass, trustSwatch } from "@/lib/utils";

const BANDS = ["HIGH_TRUST", "MEDIUM_TRUST", "LOW_TRUST", "QUARANTINED"];
const PAGE_SIZE = 80;

export default function DossierListPage() {
  // Pull a generous slice but cap rendered rows hard for snappy UI
  const { data } = useApi<{ rows: DossierRow[]; total: number }>(
    "/api/dossier?limit=2000"
  );
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [band, setBand] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "contradictions" | "compliance">("contradictions");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let rows = data?.rows ?? [];
    const s = deferredSearch.trim().toLowerCase();
    if (s) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.address_city.toLowerCase().includes(s) ||
          r.address_state.toLowerCase().includes(s)
      );
    }
    if (band) rows = rows.filter((r) => r.band === band);
    rows = rows.slice().sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "compliance") return b.compliance - a.compliance;
      return b.contradictions + b.critical_gaps - (a.contradictions + a.critical_gaps);
    });
    return rows;
  }, [data, deferredSearch, band, sortBy]);

  const visibleRows = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of data?.rows ?? []) c[r.band] = (c[r.band] ?? 0) + 1;
    return c;
  }, [data]);

  return (
    <div className="px-6 py-10 max-w-[1600px] mx-auto">
      <div className="border-b border-ink mb-1" />
      <div className="border-b border-ink h-1 mb-8" />

      <div className="grid grid-cols-12 gap-6 mb-10">
        <div className="col-span-12 lg:col-span-7">
          <div className="eyebrow mb-2">Part III · the registry</div>
          <h1 className="font-display font-bold text-4xl md:text-6xl leading-[0.95]">
            Ten thousand audited
            <br />
            <span className="italic text-accent">dossiers.</span>
          </h1>
        </div>
        <p className="col-span-12 lg:col-span-5 lg:border-l lg:border-rule-strong lg:pl-6 font-display italic text-[15px] text-ink-3 leading-snug self-end">
          Every record carries a CoV-verified capability set, a P(True)
          confidence score per claim, the WHO/NABH compliance findings, and a
          trail of citation spans drawn from the original facility report.
        </p>
      </div>

      {/* Filter bar */}
      <div className="border-y border-ink py-3 flex flex-wrap items-center gap-3 mb-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facility, city, state…"
            className="w-full bg-paper-2 border border-rule-strong px-9 py-2 text-sm font-display italic placeholder:text-ink-4 focus:border-ink focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setBand(null)}
            className={cn(
              "px-3 py-1.5 text-xs font-display border transition-colors",
              band === null
                ? "bg-ink text-paper border-ink"
                : "border-rule-strong text-ink hover:bg-paper-2"
            )}
          >
            All
            <span className="ml-1.5 font-mono text-[11px] opacity-70">
              {data?.rows?.length ?? 0}
            </span>
          </button>
          {BANDS.map((b) => (
            <button
              key={b}
              onClick={() => setBand(b)}
              className={cn(
                "px-3 py-1.5 text-xs font-display border transition-colors capitalize",
                band === b
                  ? "bg-ink text-paper border-ink"
                  : "border-rule-strong text-ink hover:bg-paper-2"
              )}
            >
              <span className={cn("inline-block h-2 w-2 mr-1.5 align-middle", trustSwatch(b))} />
              {b.replace("_", " ").toLowerCase()}
              <span className="ml-1.5 font-mono text-[11px] opacity-70">{counts[b] ?? 0}</span>
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as never)}
          className="bg-paper-2 border border-rule-strong px-3 py-2 text-sm font-display"
        >
          <option value="contradictions">Sort: contradictions</option>
          <option value="score">Sort: trust score</option>
          <option value="compliance">Sort: compliance</option>
        </select>
      </div>

      {/* Ledger */}
      <div className="border-y border-ink">
        <div className="hidden md:grid grid-cols-12 gap-3 py-2 px-3 border-b border-rule-strong text-[11px] uppercase tracking-widest text-ink-3 font-mono">
          <div className="col-span-4">Facility</div>
          <div className="col-span-2">Band</div>
          <div className="col-span-1 text-right">Trust</div>
          <div className="col-span-1 text-right">Comp.</div>
          <div className="col-span-1 text-right">Contra.</div>
          <div className="col-span-1 text-right">Gaps</div>
          <div className="col-span-2 text-right pr-4">Capabilities</div>
        </div>

        {visibleRows.map((row) => (
          <Link
            href={`/dossier/${row.facility_id}`}
            key={row.facility_id}
            prefetch={false}
            className="grid grid-cols-12 gap-3 items-center px-3 py-3 border-b border-rule last:border-b-0 hover:bg-paper-2 group"
          >
            <div className="col-span-12 md:col-span-4 flex items-center gap-3">
              <span className={cn("h-9 w-1", trustSwatch(row.band))} />
              <div>
                <div className="font-display text-[15px] text-ink group-hover:text-accent transition-colors">
                  {row.name}
                </div>
                <div className="text-[11px] text-ink-3">
                  {row.address_city}, {row.address_state}
                  <span className="font-mono text-ink-4 ml-2">{row.facility_id}</span>
                </div>
              </div>
            </div>

            <div className="col-span-3 md:col-span-2">
              <span className={cn("tag capitalize", trustClass(row.band))}>
                {row.band.replace("_", " ").toLowerCase()}
              </span>
            </div>

            <div className="col-span-2 md:col-span-1 text-right font-mono text-sm">
              {row.score.toFixed(2)}
            </div>

            <div className="col-span-2 md:col-span-1 text-right font-mono text-sm">
              {(row.compliance * 100).toFixed(0)}%
            </div>

            <div className="col-span-2 md:col-span-1 text-right font-mono text-sm text-accent">
              {row.contradictions}
            </div>

            <div className="col-span-3 md:col-span-1 text-right font-mono text-sm text-ochre">
              {row.critical_gaps}
            </div>

            <div className="col-span-12 md:col-span-2 flex flex-wrap gap-1 justify-end items-center pr-1">
              {row.caps.slice(0, 3).map((c) => (
                <span key={c} className="tag">{c}</span>
              ))}
              {row.caps.length > 3 && (
                <span className="text-[10px] text-ink-3 font-mono">
                  +{row.caps.length - 3}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-ink-4 group-hover:text-accent transition-colors" />
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-ink-3 font-display italic">
            No facilities match the current filters.
          </div>
        )}
      </div>

      {filtered.length > visible && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs font-mono text-ink-3">
            Showing {visible} of {filtered.length.toLocaleString()}
          </span>
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="px-4 py-2 text-xs font-display border border-rule-strong hover:bg-paper-2 transition-colors"
          >
            Load {Math.min(PAGE_SIZE, filtered.length - visible)} more
          </button>
        </div>
      )}
    </div>
  );
}
