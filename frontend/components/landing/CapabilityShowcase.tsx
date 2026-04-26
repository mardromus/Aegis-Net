"use client";

import Link from "next/link";
import { useApi, type CapabilityRow } from "@/lib/api";

/**
 * "What Aegis-Net actually delivers" — a closing section pairing
 * editorial copy with a real, scrollable capability ledger.
 */
const DELIVERABLES = [
  "Discovery & Verification with Chain-of-Verification",
  "P(True) × consistency-entropy confidence gating",
  "WHO + NABH dependency graph audits",
  "H3 + E2SFCA medical desert mathematics",
  "Full MLflow 3 agent traceability",
];

export function CapabilityShowcase() {
  const { data } = useApi<CapabilityRow[]>("/api/capabilities");
  const auditable = (data ?? []).filter((c) => c.has_e2sfca).slice(0, 10);

  return (
    <section className="px-6 py-20 max-w-[1600px] mx-auto">
      <div className="border-b border-ink mb-1" />
      <div className="border-b border-ink h-1 mb-10" />

      <div className="grid grid-cols-12 gap-6 lg:gap-12 items-start">
        <div className="col-span-12 lg:col-span-6">
          <div className="eyebrow mb-2">Part III · what it delivers</div>
          <h2 className="font-display font-bold text-3xl md:text-5xl leading-[0.98] text-balance">
            From a static spreadsheet
            <br />
            to a <span className="italic text-accent">living network.</span>
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-2 max-w-2xl">
            Aegis-Net turns the Virtue Foundation 10k dataset into an
            evidence-grounded reasoning layer that knows what it doesn’t know,
            cites every claim, and quantifies — to the tenth of a kilometre —
            where life-saving care is missing.
          </p>

          <ul className="mt-8 border-t border-rule-strong divide-y divide-rule">
            {DELIVERABLES.map((d, i) => (
              <li key={d} className="py-3 flex items-baseline gap-4">
                <span className="font-mono text-[11px] text-accent w-6">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-[16px] text-ink">{d}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn btn-accent">
              Open the briefing &nbsp;→
            </Link>
            <Link href="/dossier" className="btn">
              Browse dossiers
            </Link>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <div className="border-y border-ink">
            <div className="flex items-baseline justify-between px-3 py-2 border-b border-rule-strong">
              <div className="eyebrow">Capability ledger</div>
              <span className="font-mono text-[10px] text-ink-3">
                E2SFCA · auditable capabilities
              </span>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-rule-strong">
                  <th className="text-left eyebrow font-normal py-2 pl-3">Capability</th>
                  <th className="text-right eyebrow font-normal py-2">Providers</th>
                  <th className="text-right eyebrow font-normal py-2 pr-3">Desert %</th>
                </tr>
              </thead>
              <tbody>
                {auditable.map((c, i) => {
                  const dp = c.desert_pct ?? 0;
                  const tone =
                    dp > 50 ? "text-accent" : dp > 30 ? "text-ochre" : "text-moss";
                  return (
                    <tr
                      key={c.capability}
                      className="border-b border-rule last:border-b-0 hover:bg-paper-2"
                    >
                      <td className="py-2.5 pl-3">
                        <span className="font-mono text-[11px] text-ink-4 mr-2">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="font-display capitalize text-ink">
                          {c.capability.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-ink-3">
                        {c.providers.toLocaleString()}
                      </td>
                      <td className={`py-2.5 pr-3 text-right font-mono font-medium ${tone}`}>
                        {dp.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="font-display italic text-ink-3 text-sm mt-3 text-right">
            Read these as inequities, not statistics.
          </p>
        </div>
      </div>
    </section>
  );
}
