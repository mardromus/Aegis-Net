"use client";

import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { useApi, type StatsResponse, type CapabilityRow, type DossierRow } from "@/lib/api";
import { nf, trustClass, trustSwatch, titleCase } from "@/lib/utils";

const TICK = { fill: "#6E6354", fontFamily: "JetBrains Mono", fontSize: 10 };
const TOOLTIP_STYLE: React.CSSProperties = {
  background: "#F4ECDC",
  border: "1px solid #1A1612",
  borderRadius: 0,
  fontSize: 12,
  fontFamily: "JetBrains Mono",
  color: "#1A1612",
  padding: "6px 8px",
  boxShadow: "3px 3px 0 #1A1612",
};

export default function DashboardPage() {
  const { data: stats } = useApi<StatsResponse>("/api/stats");
  const { data: caps } = useApi<CapabilityRow[]>("/api/capabilities");
  const { data: dossier } = useApi<{ rows: DossierRow[]; total: number }>(
    "/api/dossier?limit=200"
  );

  const trustEntries = stats
    ? Object.entries(stats.trust_bands).map(([band, count]) => ({
        band: band.replace("_", " "),
        bandKey: band,
        count,
        fill:
          band === "HIGH_TRUST"
            ? "#4A6E4A"
            : band === "MEDIUM_TRUST"
              ? "#3B5C7A"
              : band === "LOW_TRUST"
                ? "#A77523"
                : "#B43A26",
      }))
    : [];
  const totalAudited = trustEntries.reduce((s, e) => s + e.count, 0);

  const topCaps = (stats?.top_capabilities ?? []).slice(0, 12);
  const desertSorted = (caps ?? [])
    .filter((c) => c.has_e2sfca)
    .sort((a, b) => (b.desert_pct ?? 0) - (a.desert_pct ?? 0))
    .slice(0, 8);

  return (
    <div className="px-6 py-10 max-w-[1600px] mx-auto">
      {/* Section masthead */}
      <div className="border-b border-ink mb-1" />
      <div className="border-b border-ink h-1 mb-8" />

      <div className="grid grid-cols-12 gap-6 mb-10">
        <div className="col-span-12 lg:col-span-8">
          <div className="eyebrow mb-2">Part I · the briefing</div>
          <h1 className="font-display font-bold text-4xl md:text-6xl leading-[0.95] text-balance">
            Healthcare reasoning,
            <br />
            in <span className="italic text-accent">real time.</span>
          </h1>
        </div>
        <div className="col-span-12 lg:col-span-4 lg:border-l lg:border-rule-strong lg:pl-6 flex items-end">
          <p className="font-display italic text-[15px] text-ink-3 leading-snug">
            Each figure on this page derives from the live Aegis-Net pipeline.
            Quarantine threshold is <span className="font-mono not-italic">P(True) = 0.88</span>.
            Below that, claims are routed to a human steward.
          </p>
        </div>
      </div>

      {/* Big four KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-rule-strong border-y border-ink mb-10">
        <Kpi label="Facilities indexed" value={stats ? nf(stats.facility_count) : "—"} />
        <Kpi label="Cities covered" value={stats ? nf(stats.city_count) : "—"} />
        <Kpi label="Audited by swarm" value={stats ? nf(stats.audited_count) : "—"} />
        <Kpi
          label="Quarantined"
          value={stats ? nf(stats.trust_bands.QUARANTINED ?? 0) : "—"}
          accent
          sub={
            stats && stats.audited_count > 0
              ? `${(((stats.trust_bands.QUARANTINED ?? 0) / stats.audited_count) * 100).toFixed(1)}% of audited`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Top capabilities — large editorial bar chart */}
        <section className="col-span-12 lg:col-span-8">
          <div className="flex items-baseline justify-between border-b border-ink pb-2">
            <div>
              <div className="eyebrow">Figure I</div>
              <h3 className="font-display text-2xl font-bold mt-1">
                The capabilities most often claimed
              </h3>
            </div>
            <span className="font-mono text-[10px] text-ink-3">
              from raw_capability_tags
            </span>
          </div>
          <div className="h-[320px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCaps} margin={{ top: 8, right: 12, bottom: 56, left: 0 }}>
                <XAxis
                  dataKey="capability"
                  tick={TICK}
                  axisLine={{ stroke: "#1A1612" }}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(180,58,38,0.08)" }} />
                <Bar dataKey="count" fill="#1A1612" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Trust bands */}
        <section className="col-span-12 lg:col-span-4">
          <div className="flex items-baseline justify-between border-b border-ink pb-2">
            <div>
              <div className="eyebrow">Figure II</div>
              <h3 className="font-display text-xl font-bold mt-1">
                Trust band distribution
              </h3>
            </div>
            <span className="font-mono text-[10px] text-ink-3">
              n = {nf(totalAudited)}
            </span>
          </div>
          <ul className="divide-y divide-rule">
            {trustEntries.map((e) => {
              const pct = totalAudited ? (e.count / totalAudited) * 100 : 0;
              return (
                <li key={e.bandKey} className="py-3">
                  <div className="flex items-baseline justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`block h-2.5 w-2.5 ${trustSwatch(e.bandKey)}`} />
                      <span className="font-display text-[15px] capitalize">
                        {e.band.toLowerCase()}
                      </span>
                    </div>
                    <span className="font-mono text-[13px] text-ink">
                      {nf(e.count)}{" "}
                      <span className="text-ink-3 ml-1">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-[3px] bg-paper-3">
                    <div className="h-full" style={{ width: `${pct}%`, background: e.fill }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Most contradictory facilities */}
        <section className="col-span-12 mt-6">
          <div className="flex items-baseline justify-between border-b border-ink pb-2">
            <div>
              <div className="eyebrow">Figure III</div>
              <h3 className="font-display text-2xl font-bold mt-1">
                The most contradictory facilities
              </h3>
              <p className="font-display italic text-ink-3 text-[14px]">
                Where the trust scorer found the most contradictions or critical gaps. Read the citation trail.
              </p>
            </div>
            <Link href="/dossier" className="link text-sm">View all dossiers →</Link>
          </div>
          <div className="overflow-x-auto border-y border-ink">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-rule-strong">
                  <th className="eyebrow font-normal text-left py-2 pl-3">Facility</th>
                  <th className="eyebrow font-normal text-left py-2">City</th>
                  <th className="eyebrow font-normal text-left py-2">Band</th>
                  <th className="eyebrow font-normal text-right py-2">Trust</th>
                  <th className="eyebrow font-normal text-right py-2">Contra.</th>
                  <th className="eyebrow font-normal text-right py-2">Gaps</th>
                  <th className="eyebrow font-normal text-left py-2 pl-4 pr-3">Capabilities</th>
                </tr>
              </thead>
              <tbody>
                {(dossier?.rows ?? [])
                  .slice()
                  .sort(
                    (a, b) =>
                      b.contradictions + b.critical_gaps -
                      (a.contradictions + a.critical_gaps)
                  )
                  .slice(0, 10)
                  .map((row) => (
                    <tr
                      key={row.facility_id}
                      className="border-b border-rule last:border-b-0 hover:bg-paper-2"
                    >
                      <td className="py-2.5 pl-3">
                        <Link
                          href={`/dossier/${row.facility_id}`}
                          className="link text-ink"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="py-2.5 text-ink-3">{row.address_city}</td>
                      <td className="py-2.5">
                        <span className={`tag ${trustClass(row.band)}`}>
                          {row.band.replace("_", " ").toLowerCase()}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono">{row.score.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono text-accent">
                        {row.contradictions}
                      </td>
                      <td className="py-2.5 text-right font-mono text-ochre">
                        {row.critical_gaps}
                      </td>
                      <td className="py-2.5 pl-4 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {row.caps.slice(0, 4).map((c) => (
                            <span key={c} className="tag">{c}</span>
                          ))}
                          {row.caps.length > 4 && (
                            <span className="text-[11px] text-ink-3 font-mono">
                              +{row.caps.length - 4}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Capability inequity ledger */}
        <section className="col-span-12 lg:col-span-7 mt-6">
          <div className="flex items-baseline justify-between border-b border-ink pb-2">
            <div>
              <div className="eyebrow">Figure IV</div>
              <h3 className="font-display text-2xl font-bold mt-1">
                Inequity, ranked
              </h3>
            </div>
            <Link href="/map" className="link text-sm">Open atlas →</Link>
          </div>
          <ul className="border-b border-rule">
            {desertSorted.map((c, i) => (
              <li
                key={c.capability}
                className="grid grid-cols-12 gap-3 items-center border-b border-rule py-2.5"
              >
                <span className="col-span-1 font-mono text-[11px] text-ink-4">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="col-span-3 font-display capitalize">
                  {titleCase(c.capability)}
                </span>
                <div className="col-span-5 h-[3px] bg-paper-3">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${c.desert_pct ?? 0}%` }}
                  />
                </div>
                <span className="col-span-2 text-right font-mono text-ink">
                  {(c.desert_pct ?? 0).toFixed(1)}%
                </span>
                <span className="col-span-1 text-right font-mono text-ink-3 text-[11px]">
                  {nf(c.providers)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Top states bar */}
        <section className="col-span-12 lg:col-span-5 mt-6">
          <div className="flex items-baseline justify-between border-b border-ink pb-2">
            <div>
              <div className="eyebrow">Figure V</div>
              <h3 className="font-display text-2xl font-bold mt-1">
                The top-served states
              </h3>
            </div>
            <span className="font-mono text-[10px] text-ink-3">by facility count</span>
          </div>
          <div className="h-[300px] pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.top_states ?? []} layout="vertical" margin={{ left: 16, right: 12 }}>
                <XAxis type="number" tick={TICK} axisLine={{ stroke: "#1A1612" }} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="state"
                  tick={{ ...TICK, fontFamily: "Fraunces", fontSize: 12, fill: "#1A1612" }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(31,58,85,0.08)" }} />
                <Bar dataKey="count" fill="#1F3A55">
                  {(stats?.top_states ?? []).map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#B43A26" : "#1F3A55"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="px-5 py-7">
      <div className="eyebrow">{label}</div>
      <div
        className={`num-display text-[3rem] md:text-[3.6rem] font-bold mt-1 ${accent ? "text-accent" : "text-ink"}`}
      >
        {value}
      </div>
      {sub && <div className="font-mono text-[11px] text-ink-3 mt-1">{sub}</div>}
    </div>
  );
}
