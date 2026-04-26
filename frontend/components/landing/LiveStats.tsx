"use client";

import { useApi, type StatsResponse, type CapabilityRow } from "@/lib/api";
import { nf } from "@/lib/utils";

const FACTS = [
  { label: "Facilities indexed", key: "facility_count" as const },
  { label: "States & UTs covered", key: "state_count" as const },
  { label: "Cities reached", key: "city_count" as const },
  { label: "Audited by swarm", key: "audited_count" as const },
];

export function LiveStats() {
  const { data: stats } = useApi<StatsResponse>("/api/stats");
  const { data: caps } = useApi<CapabilityRow[]>("/api/capabilities");

  const desertCaps = (caps ?? [])
    .filter((c) => c.has_e2sfca && c.desert_pct !== null)
    .sort((a, b) => (b.desert_pct! - a.desert_pct!))
    .slice(0, 8);

  return (
    <section className="px-6 py-14 max-w-[1600px] mx-auto">
      <div className="border-b border-ink mb-1" />
      <div className="border-b border-ink h-1 mb-8" />

      <div className="flex items-baseline justify-between mb-8">
        <h2 className="font-display font-bold text-3xl md:text-4xl">
          The briefing in numbers.
        </h2>
        <span className="font-display italic text-ink-3 text-sm">
          live from the lakehouse, computed on the full 10k dataset
        </span>
      </div>

      {/* Big four — cream tabular figures, no glow */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-rule-strong border-y border-ink">
        {FACTS.map((f) => (
          <div key={f.label} className="px-5 py-7">
            <div className="eyebrow">{f.label}</div>
            <div className="num-display text-[3.2rem] md:text-[4rem] font-bold text-ink mt-1">
              {stats ? nf(stats[f.key]) : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Capability inequity table */}
      {desertCaps.length > 0 && (
        <div className="mt-12 grid grid-cols-12 gap-6 lg:gap-10">
          <div className="col-span-12 lg:col-span-4">
            <div className="eyebrow mb-2">Figure I</div>
            <h3 className="font-display text-2xl md:text-3xl font-bold leading-tight">
              Where the deserts run deepest.
            </h3>
            <p className="font-display italic text-ink-3 mt-3 text-[15px] leading-relaxed">
              Share of populated H3 hexagons in the bottom-quartile of E2SFCA
              accessibility, by capability. Read these as inequity multipliers:
              the wider the bar, the longer the drive.
            </p>
            <p className="text-[13px] text-ink-3 mt-3 leading-relaxed">
              Methodology: H3 resolution 7 mesh, Gaussian distance decay,
              50&nbsp;km catchment, computed against geocoded provider centroids.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-8 border-y border-ink">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-rule-strong text-left">
                  <th className="eyebrow py-2 pl-3 font-normal">#</th>
                  <th className="eyebrow py-2 font-normal">Capability</th>
                  <th className="eyebrow py-2 font-normal">Inequity</th>
                  <th className="eyebrow py-2 text-right font-normal">In desert</th>
                  <th className="eyebrow py-2 pr-3 text-right font-normal">Providers</th>
                </tr>
              </thead>
              <tbody>
                {desertCaps.map((c, i) => (
                  <tr
                    key={c.capability}
                    className="border-b border-rule last:border-b-0"
                  >
                    <td className="py-2.5 pl-3 font-mono text-ink-4 text-[11px] w-10">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="py-2.5 font-display text-[15px] capitalize text-ink">
                      {c.capability.replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5">
                      <div className="h-[3px] bg-paper-3 w-full max-w-[220px]">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${c.desert_pct ?? 0}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 font-mono text-right text-ink">
                      {c.desert_pct?.toFixed(1)}%
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-right text-ink-3">
                      {nf(c.providers)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
