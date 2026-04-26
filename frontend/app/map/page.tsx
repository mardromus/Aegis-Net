"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useApi, type CapabilityRow, type GeoDesertRow } from "@/lib/api";
import { titleCase, nf } from "@/lib/utils";

const HexMap = dynamic(
  () => import("@/components/map/HexMap").then((m) => m.HexMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

type ProvidersResponse = {
  capability: string;
  count: number;
  rows: {
    facility_id: string;
    name: string;
    latitude: number;
    longitude: number;
    address_city: string;
  }[];
};

export default function MapPage() {
  const { data: caps } = useApi<CapabilityRow[]>("/api/capabilities");
  const auditable = (caps ?? []).filter((c) => c.has_e2sfca);
  const [capability, setCapability] = useState("trauma");
  const [showProviders, setShowProviders] = useState(true);
  const [onlyDeserts, setOnlyDeserts] = useState(false);

  const { data: hexData, isLoading } = useApi<{ rows: GeoDesertRow[] }>(
    `/api/geo/desert/${capability}${onlyDeserts ? "?only_deserts=true" : ""}`
  );
  const { data: providers } = useApi<ProvidersResponse>(
    `/api/geo/providers/${capability}`
  );

  const desertCount = hexData?.rows.filter((r) => r.desert).length ?? 0;
  const totalHex = hexData?.rows.length ?? 0;

  return (
    <div className="px-6 py-10 max-w-[1600px] mx-auto">
      {/* Section masthead */}
      <div className="border-b border-ink mb-1" />
      <div className="border-b border-ink h-1 mb-8" />

      <div className="grid grid-cols-12 gap-6 mb-8 items-end">
        <div className="col-span-12 lg:col-span-7">
          <div className="eyebrow mb-2">Part II · the atlas</div>
          <h1 className="font-display font-bold text-4xl md:text-6xl leading-[0.95] text-balance">
            Where life-saving care
            <br />
            is <span className="italic text-accent">mathematically out of reach.</span>
          </h1>
          <p className="font-display italic text-ink-3 mt-3 text-[15px]">
            H3 resolution 7 · Gaussian distance decay · 50 km catchment ·
            E2SFCA accessibility — by capability.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-5 flex flex-wrap gap-2 justify-end items-center">
          <select
            value={capability}
            onChange={(e) => setCapability(e.target.value)}
            className="font-display text-[15px] bg-paper border border-ink px-3 py-2 capitalize focus:outline-none focus:bg-paper-2"
          >
            {auditable.map((c) => (
              <option key={c.capability} value={c.capability}>
                {titleCase(c.capability)} · {c.providers.toLocaleString()} prov.
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowProviders((s) => !s)}
            className={`px-3 py-2 text-[13px] font-display border transition-colors ${
              showProviders
                ? "bg-ink text-paper border-ink"
                : "border-ink text-ink hover:bg-paper-2"
            }`}
          >
            {showProviders ? "Hide" : "Show"} providers
          </button>
          <button
            onClick={() => setOnlyDeserts((d) => !d)}
            className={`px-3 py-2 text-[13px] font-display border transition-colors ${
              onlyDeserts
                ? "bg-accent text-paper border-accent"
                : "border-ink text-ink hover:bg-paper-2"
            }`}
          >
            Only deserts
          </button>
        </div>
      </div>

      {/* Map + side panel */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 border border-ink h-[640px] relative bg-paper-2">
          {isLoading ? (
            <MapSkeleton />
          ) : (
            <HexMap
              hexes={hexData?.rows ?? []}
              providers={(providers?.rows ?? []) as never}
              showProviders={showProviders}
            />
          )}

          {/* Floating fact card top-right (paper, hand-drawn-feel) */}
          <div className="absolute top-4 right-4 pane px-3 py-2.5 text-[12px] shadow-letterpressSm pointer-events-none">
            <div className="eyebrow mb-1">{titleCase(capability)}</div>
            <Stat label="Hexes" value={nf(totalHex)} />
            <Stat label="Providers" value={nf(providers?.count ?? 0)} />
            <Stat
              label="In desert"
              value={nf(desertCount)}
              accent
            />
            <Stat
              label="% in desert"
              value={
                totalHex
                  ? `${((desertCount / totalHex) * 100).toFixed(1)}%`
                  : "—"
              }
              accent
            />
          </div>
        </div>

        {/* Inequity ledger + reading guide */}
        <aside className="col-span-12 lg:col-span-4 space-y-6">
          <div className="border border-ink">
            <div className="flex items-baseline justify-between px-3 py-2 border-b border-ink bg-paper-2">
              <div className="eyebrow">Capability inequity</div>
              <span className="font-mono text-[10px] text-ink-3">
                FIG. {Math.min(auditable.length, 10).toString().padStart(2, "0")}
              </span>
            </div>
            <ul className="divide-y divide-rule">
              {auditable
                .slice()
                .sort((a, b) => (b.desert_pct ?? 0) - (a.desert_pct ?? 0))
                .map((c) => {
                  const active = capability === c.capability;
                  return (
                    <li key={c.capability}>
                      <button
                        onClick={() => setCapability(c.capability)}
                        className={`w-full text-left px-3 py-2.5 transition-colors ${
                          active ? "bg-accent/10" : "hover:bg-paper-2"
                        }`}
                      >
                        <div className="flex items-baseline justify-between mb-1">
                          <span className={`font-display capitalize text-[15px] ${active ? "text-accent" : "text-ink"}`}>
                            {titleCase(c.capability)}
                          </span>
                          <span className={`font-mono text-[12px] ${active ? "text-accent" : "text-ink-3"}`}>
                            {c.desert_pct?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-[3px] bg-paper-3">
                          <div
                            className={`h-full ${active ? "bg-accent" : "bg-ink-2"}`}
                            style={{ width: `${c.desert_pct ?? 0}%` }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>

          <div className="border border-ink p-4 bg-paper-2">
            <div className="eyebrow mb-2">How to read this map</div>
            <ol className="space-y-2 text-[13px] text-ink-2 leading-relaxed">
              <li className="flex gap-3">
                <span className="font-mono text-[11px] text-accent">i.</span>
                Each hexagon is an H3 res 7 cell, edge ≈ 1.2 km, area ≈ 5 km².
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[11px] text-accent">ii.</span>
                Colour encodes Stage-2 E2SFCA accessibility: cream is
                desert-floor, moss is well-served. Providers weight a hexagon by
                Gaussian decay across a 50 km catchment.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[11px] text-accent">iii.</span>
                Hexes ringed in dark sit in the bottom 25th percentile for the
                selected capability — the medical desert.
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-paper-2">
      <div className="text-center">
        <div className="font-mono text-[10px] tracking-widest text-ink-3 animate-slowfade">
          ETCHING THE ATLAS…
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-px">
      <span className="text-ink-3 font-display text-[12px]">{label}</span>
      <span className={`font-mono ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}
