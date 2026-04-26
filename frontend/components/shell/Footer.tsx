/**
 * Colophon — book-style footer.
 * Records the type, the data sources, the build, the people.
 */
export function Footer() {
  return (
    <footer className="mt-24">
      <div className="border-t border-ink" />
      <div className="border-b border-ink h-1 mb-8" />
      <div className="max-w-[1600px] mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-12 gap-8 text-sm text-ink-2">
          <div className="md:col-span-4">
            <div className="font-display text-2xl font-bold leading-tight">
              Aegis<span className="text-accent">·</span>Net
            </div>
            <p className="font-display italic text-ink-3 text-[15px] mt-1">
              A reasoning atlas of Indian healthcare,
              <br />
              first published in the year of our hackathon,
              <br />
              compiled in cream and vermillion.
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="eyebrow mb-2">Sources</div>
            <ul className="space-y-1.5 text-[13px] leading-snug">
              <li>Virtue Foundation 10k</li>
              <li>WHO Surgical Safety Checklist</li>
              <li>NABH ICU/OT standards</li>
              <li>AERB · ICMR Cancer atlas</li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="eyebrow mb-2">Methods</div>
            <ul className="space-y-1.5 text-[13px] leading-snug">
              <li>Chain of Verification</li>
              <li>P(True) × consistency</li>
              <li>WHO/NABH dependency graph</li>
              <li>H3 res 7 · E2SFCA</li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="eyebrow mb-2">Stack</div>
            <ul className="space-y-1.5 text-[13px] leading-snug">
              <li>Databricks Lakehouse</li>
              <li>Mosaic AI Vector Search</li>
              <li>MLflow 3 tracing</li>
              <li>Agno · FastAPI · Next.js</li>
            </ul>
          </div>

          <div className="md:col-span-2 text-right">
            <div className="eyebrow mb-2">Colophon</div>
            <p className="text-[13px] leading-snug text-ink-3">
              Set in <span className="font-display italic">Fraunces</span> &
              Inter,
              <br />
              with figures in JetBrains Mono.
              <br />
              <span className="font-mono text-[10px] tracking-widest text-ink-4 mt-2 inline-block">
                v1.0 · OFFLINE-FIRST
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
