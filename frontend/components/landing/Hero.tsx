"use client";

import Link from "next/link";
import { useApi, type StatsResponse } from "@/lib/api";
import { nf } from "@/lib/utils";

/**
 * Newspaper hero — masthead, kicker, deck, lede.
 * Three-column body that ends with two letterpress-style buttons.
 * No glow, no gradient, no orbs.
 */
export function Hero() {
  const { data: stats } = useApi<StatsResponse>("/api/stats");
  const stateCount = stats?.state_count ?? null;
  return (
    <section className="relative px-6 pt-12 pb-20 max-w-[1600px] mx-auto">
      {/* Edition strip */}
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <span className="font-display italic text-[15px] text-ink-3">
          Sunday Edition · Compound AI Quarterly
        </span>
        <span className="font-mono text-[10px] tracking-widest text-ink-3 uppercase">
          For 1.4 billion lives · price one keystroke
        </span>
      </div>
      <div className="border-b border-ink h-1 mb-10" />

      <div className="grid grid-cols-12 gap-6 lg:gap-10">
        {/* Lead headline */}
        <div className="col-span-12 lg:col-span-8">
          <div className="eyebrow mb-3">
            An investigation across{" "}
            {stateCount !== null ? `${nf(stateCount)} states & UTs` : "every Indian state"}
          </div>
          <h1 className="font-display font-bold tracking-tight text-ink leading-[0.92] text-[3.4rem] md:text-[5.2rem] lg:text-[6.4rem] text-balance">
            In India, a postal&nbsp;code
            <br />
            often determines a{" "}
            <span className="italic text-accent">lifespan.</span>
          </h1>
          <p className="mt-6 font-display text-xl md:text-2xl text-ink-2 leading-snug max-w-3xl text-balance">
            Aegis-Net is a self-auditing reasoning layer that turns 10,000 messy
            facility reports into evidence-grounded, citation-anchored,
            geospatially-precise intelligence — and names the deserts where
            life-saving care is mathematically out of reach.
          </p>
        </div>

        {/* Sidebar: dateline + the four pillars */}
        <aside className="col-span-12 lg:col-span-4 lg:border-l lg:border-rule-strong lg:pl-6">
          <div className="eyebrow mb-2">Dateline</div>
          <div className="font-display text-[15px] text-ink-2 leading-snug">
            <div>Bengaluru · Patna · Coimbatore</div>
            <div>Compiled offline-first.</div>
            <div>Zero hallucinations by construction.</div>
          </div>

          <div className="mt-6 border-t border-rule pt-4">
            <div className="eyebrow mb-2">In this volume</div>
            <ol className="font-display text-[15px] text-ink leading-relaxed space-y-1 list-none">
              <li>
                <span className="font-mono text-[11px] text-accent mr-2">I.</span>
                A briefing from the lakehouse
              </li>
              <li>
                <span className="font-mono text-[11px] text-accent mr-2">II.</span>
                The atlas of medical deserts
              </li>
              <li>
                <span className="font-mono text-[11px] text-accent mr-2">III.</span>
                Ten thousand audited dossiers
              </li>
              <li>
                <span className="font-mono text-[11px] text-accent mr-2">IV.</span>
                The agents and their reasoning
              </li>
            </ol>
          </div>
        </aside>
      </div>

      {/* Lede paragraph (drop-cap, two-column body) */}
      <div className="mt-12 grid grid-cols-12 gap-6 lg:gap-10">
        <div className="col-span-12 lg:col-span-8 lg:col-2 col-rule">
          <p className="dropcap text-[15px] leading-[1.7] text-ink-2 first:mt-0">
            Seventy per cent of India lives outside Tier-1 cities. The crisis is
            not only a hospital shortage — it is a <em>discovery</em> crisis.
            Families travel for hours only to learn a facility lacks the oxygen
            supply, the neonatal bed, or the specialist they need. The Virtue
            Foundation 10,000-facility dataset reflects this reality: half the
            rows are blank, capability fields are unstructured strings, claims
            contradict each other, and there is no ground truth.
          </p>
          <p className="text-[15px] leading-[1.7] text-ink-2 mt-4">
            A naive language model would hallucinate ICUs into existence.
            Aegis-Net refuses. Every claim must survive a Chain of Verification,
            be gated by a calibrated <span className="font-mono">P(True)</span>
            interval, and pass the WHO–NABH dependency graph. Anything below
            confidence <span className="font-mono">0.88</span> is quarantined and
            routed to a human steward. Then the desert math happens: an
            Enhanced Two-Step Floating Catchment Area on H3 hexagons names the
            postal codes that are still unreachable.
          </p>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Link
            href="/dashboard"
            className="btn btn-accent w-full justify-center mb-3"
          >
            Read the briefing &nbsp;→
          </Link>
          <Link
            href="/map"
            className="btn w-full justify-center"
          >
            Open the atlas
          </Link>

          <div className="mt-6 border-t border-rule pt-4">
            <div className="eyebrow mb-2">A quick read</div>
            <p className="font-display text-[15px] text-ink-3 italic leading-relaxed">
              “In a pathology lab in Coimbatore that claimed cardiology,
              maternity, and ICU, the auditor flagged five contradictions and
              quarantined the record at trust 0.19.”
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
