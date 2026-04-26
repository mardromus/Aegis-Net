"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Loader2, Search, Sparkles, ChevronRight, X } from "lucide-react";
import { useApi, type CapabilityRow } from "@/lib/api";
import { cn, titleCase } from "@/lib/utils";

const NearbyMap = dynamic(() => import("@/components/map/NearbyMap").then((m) => m.NearbyMap), {
  ssr: false,
  loading: () => (
    <div className="grid place-items-center h-full text-ink-3 text-sm font-display italic">
      Initialising map…
    </div>
  ),
});

type City = {
  city: string;
  state: string;
  facility_count: number;
  lat: number;
  lon: number;
};

type CitiesResp = { count: number; rows: City[] };

type NearbyResp = {
  count: number;
  rows: {
    facility_id: string;
    name: string;
    address_city: string;
    address_stateOrRegion: string;
    latitude: number;
    longitude: number;
    distance_km: number;
    raw_capability_tags: string[];
  }[];
};

const PRESETS: { label: string; desc: string; caps: string[] }[] = [
  { label: "Emergency trauma", desc: "ICU + trauma + imaging", caps: ["icu", "trauma", "imaging_ct"] },
  { label: "Cardiac care", desc: "Cardiology + cardiac surgery", caps: ["cardiology", "cardiac_surgery"] },
  { label: "Maternal care", desc: "Maternity + neonatal ICU", caps: ["maternity", "neonatal"] },
  { label: "Renal care", desc: "Dialysis access", caps: ["dialysis"] },
  { label: "Cancer care", desc: "Oncology", caps: ["oncology"] },
  { label: "Neurosurgery", desc: "Neuro + ICU + imaging", caps: ["neurosurgery", "icu", "imaging_mri"] },
];

export default function ReasonPage() {
  const { data: caps } = useApi<CapabilityRow[]>("/api/capabilities");
  const router = useRouter();

  const [must, setMust] = useState<string[]>(["icu", "trauma"]);
  const [radius, setRadius] = useState(50);

  // City autocomplete
  const [cityInput, setCityInput] = useState("Patna");
  const [cityOpen, setCityOpen] = useState(false);
  const [anchor, setAnchor] = useState<City | null>(null);
  const cityWrapRef = useRef<HTMLDivElement>(null);
  const { data: cityHits } = useApi<CitiesResp>(
    cityInput.length >= 2 ? `/api/geo/cities?q=${encodeURIComponent(cityInput)}&limit=10` : null
  );

  // Resolve a default anchor on first load
  useEffect(() => {
    if (!anchor && cityHits?.rows?.length) {
      setAnchor(cityHits.rows[0]);
    }
  }, [cityHits, anchor]);

  // Close suggestions on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (cityWrapRef.current && !cityWrapRef.current.contains(e.target as Node)) {
        setCityOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Run query
  const queryUrl = useMemo(() => {
    if (!anchor) return null;
    const capQs = must.length > 0 ? `&capabilities=${must.join(",")}` : "";
    return `/api/geo/nearby?lat=${anchor.lat}&lon=${anchor.lon}&radius_km=${radius}${capQs}&limit=200`;
  }, [anchor, must, radius]);

  const { data: results, isLoading } = useApi<NearbyResp>(queryUrl);

  const filteredCaps = useMemo(() => {
    return (caps ?? []).slice(0, 26);
  }, [caps]);

  function toggleCap(c: string) {
    setMust((m) => (m.includes(c) ? m.filter((x) => x !== c) : [...m, c]));
  }

  function applyPreset(caps: string[]) {
    setMust(caps);
  }

  return (
    <div className="px-6 py-10 max-w-[1600px] mx-auto">
      {/* Heading */}
      <div className="border-b border-ink mb-1" />
      <div className="border-b border-ink h-1 mb-8" />
      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-12 lg:col-span-7">
          <div className="eyebrow mb-2">Part IV · the reasoning console</div>
          <h1 className="font-display font-bold text-4xl md:text-6xl leading-[0.95]">
            Compose a constraint.
            <br />
            <span className="italic text-accent">Find the help.</span>
          </h1>
        </div>
        <p className="col-span-12 lg:col-span-5 lg:border-l lg:border-rule-strong lg:pl-6 font-display italic text-[15px] text-ink-3 leading-snug self-end">
          Pick the capabilities a patient needs, anchor on a city, set a radius —
          Aegis-Net surfaces every facility in the catchment that satisfies all
          constraints, with distance and capability tags.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* CONTROLS */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Presets */}
          <div className="border border-rule-strong">
            <div className="border-b border-ink px-3 py-2 flex items-center justify-between">
              <div className="eyebrow">Preset patterns</div>
              <Sparkles className="h-3.5 w-3.5 text-accent" />
            </div>
            <div className="grid grid-cols-1 divide-y divide-rule">
              {PRESETS.map((p) => {
                const active = p.caps.length === must.length && p.caps.every((c) => must.includes(c));
                return (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.caps)}
                    className={cn(
                      "px-3 py-2.5 text-left transition-colors hover:bg-paper-2",
                      active && "bg-paper-2"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-sm">{p.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-ink-3" />
                    </div>
                    <div className="text-[11px] text-ink-3 font-mono mt-0.5">
                      {p.caps.join(" · ")}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capability picker */}
          <div className="border border-rule-strong">
            <div className="border-b border-ink px-3 py-2 flex items-center justify-between">
              <div className="eyebrow">Required capabilities</div>
              <span className="font-mono text-[10px] text-ink-3">
                {must.length} selected
              </span>
            </div>
            <div className="p-3 flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
              {filteredCaps.map((c) => {
                const active = must.includes(c.capability);
                return (
                  <button
                    key={c.capability}
                    onClick={() => toggleCap(c.capability)}
                    className={cn(
                      "px-2 py-1 text-[11px] font-display border transition-colors",
                      active
                        ? "bg-ink text-paper border-ink"
                        : "border-rule-strong text-ink hover:bg-paper-2"
                    )}
                  >
                    {titleCase(c.capability)}
                    <span className={cn("ml-1.5 font-mono text-[9px]", active ? "opacity-70" : "text-ink-3")}>
                      {c.providers.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anchor city autocomplete */}
          <div className="border border-rule-strong">
            <div className="border-b border-ink px-3 py-2 eyebrow">Anchor city</div>
            <div className="p-3 space-y-3" ref={cityWrapRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3 pointer-events-none" />
                <input
                  value={cityInput}
                  onChange={(e) => {
                    setCityInput(e.target.value);
                    setCityOpen(true);
                  }}
                  onFocus={() => setCityOpen(true)}
                  placeholder="Patna, Bhopal, Coimbatore…"
                  className="w-full bg-paper-2 border border-rule-strong px-9 py-2 text-sm font-display italic placeholder:text-ink-4 focus:border-ink focus:outline-none"
                />
                {cityInput && (
                  <button
                    onClick={() => {
                      setCityInput("");
                      setCityOpen(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-ink-3 hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {cityOpen && cityHits?.rows && cityHits.rows.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-72 overflow-y-auto border border-ink bg-paper shadow-lg">
                    {cityHits.rows.map((c) => {
                      const active = anchor && anchor.city === c.city && anchor.state === c.state;
                      return (
                        <button
                          key={`${c.city}-${c.state}`}
                          onClick={() => {
                            setAnchor(c);
                            setCityInput(c.city);
                            setCityOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm border-b border-rule last:border-b-0 hover:bg-paper-2",
                            active && "bg-paper-2"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display">{c.city}</span>
                            <span className="text-[10px] font-mono text-ink-3">
                              {c.facility_count.toLocaleString()} fac.
                            </span>
                          </div>
                          <div className="text-[11px] text-ink-3 mt-0.5">{c.state}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {anchor && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-ink-3">
                  <MapPin className="h-3 w-3" />
                  {anchor.lat.toFixed(3)}, {anchor.lon.toFixed(3)} · {anchor.state}
                </div>
              )}

              {/* Radius slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="eyebrow">Radius</span>
                  <span className="font-mono text-sm">{radius} km</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={300}
                  step={5}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-ink-4 mt-0.5">
                  <span>5</span>
                  <span>50</span>
                  <span>150</span>
                  <span>300</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active query summary */}
          <div className="border border-ink bg-paper-2 px-3 py-3">
            <div className="eyebrow mb-2">Live query</div>
            <div className="font-mono text-[11px] text-ink-2 leading-relaxed">
              <span className="text-accent">find</span> facility{" "}
              <span className="text-ink-3">where</span>
              <br />
              {must.length === 0 ? (
                <span className="italic text-ink-3 ml-2">(any capability)</span>
              ) : (
                <span className="ml-2">
                  caps ⊇ {"{"}
                  <span className="text-accent">{must.join(", ")}</span>
                  {"}"}
                </span>
              )}
              <br />
              <span className="text-ink-3">and</span> distance ≤{" "}
              <span className="text-accent">{radius} km</span>
              <br />
              <span className="text-ink-3">from</span>{" "}
              <span className="text-accent">{anchor ? anchor.city : "(no anchor)"}</span>
            </div>
          </div>
        </div>

        {/* MAP + RESULTS */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="relative border border-rule-strong h-[460px] overflow-hidden bg-paper-2">
            <NearbyMap
              anchor={anchor ? { lat: anchor.lat, lon: anchor.lon, label: anchor.city } : null}
              radiusKm={radius}
              results={results?.rows ?? []}
              onPick={(id) => router.push(`/dossier/${id}`)}
            />
            <div className="absolute top-3 left-3 z-10 border border-rule-strong bg-paper/95 backdrop-blur px-3 py-2 pointer-events-none">
              <div className="eyebrow mb-0.5">Catchment</div>
              <div className="font-mono text-[11px]">
                {anchor?.city ?? "—"} · {radius} km · {results?.count ?? 0} hits
              </div>
            </div>
            {isLoading && (
              <div className="absolute top-3 right-3 z-10 border border-rule-strong bg-paper/95 backdrop-blur px-3 py-2 flex items-center gap-2 text-[11px] text-ink-2 pointer-events-none">
                <Loader2 className="h-3 w-3 animate-spin" />
                computing…
              </div>
            )}
            {/* Color legend */}
            <div className="absolute bottom-3 left-3 z-10 border border-rule-strong bg-paper/95 backdrop-blur px-3 py-2 pointer-events-none">
              <div className="eyebrow mb-1">Distance</div>
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-32"
                  style={{
                    background:
                      "linear-gradient(90deg, #4A6E4A 0%, #A77523 50%, #B43A26 100%)",
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 font-mono text-[9px] text-ink-3">
                <span>near</span>
                <span>{radius} km</span>
              </div>
            </div>
          </div>

          {/* Results list */}
          <div className="border border-rule-strong">
            <div className="border-b border-ink px-3 py-2 flex items-center justify-between">
              <div className="eyebrow">
                {results?.count ?? 0} matching facilit{results?.count === 1 ? "y" : "ies"}
              </div>
              <span className="font-mono text-[10px] text-ink-3">
                must have: {must.join(" + ") || "(any)"}
              </span>
            </div>
            {(!results || results.rows.length === 0) ? (
              <div className="text-center py-10 text-ink-3 font-display italic text-sm">
                No matches. Try widening the radius, relaxing constraints, or
                anchoring on a different city —{" "}
                <span className="text-accent">this gap might itself be a medical desert</span>.
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto">
                {results.rows.map((r, i) => (
                  <Link
                    href={`/dossier/${r.facility_id}`}
                    key={r.facility_id}
                    prefetch={false}
                    className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 border-b border-rule last:border-b-0 hover:bg-paper-2 group"
                  >
                    <span className="col-span-1 font-mono text-[10px] text-ink-3">
                      #{i + 1}
                    </span>
                    <div className="col-span-5">
                      <div className="font-display text-sm group-hover:text-accent transition-colors">
                        {r.name}
                      </div>
                      <div className="text-[10px] text-ink-3">
                        {r.address_city}, {r.address_stateOrRegion}
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="font-mono text-sm">{r.distance_km.toFixed(1)} km</div>
                    </div>
                    <div className="col-span-4 flex flex-wrap gap-1 justify-end">
                      {(r.raw_capability_tags ?? []).slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className={cn(
                            "px-1 py-0.5 text-[9px] font-mono border",
                            must.includes(t)
                              ? "bg-accent text-paper border-accent"
                              : "border-rule text-ink-3"
                          )}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
