/**
 * Five layered chapters of the system. Editorial — numeric chapter
 * markers, italic deck, hairline rules, no gradient backgrounds.
 */

const CHAPTERS = [
  {
    n: "I.",
    title: "Data engineering",
    deck: "Bronze, silver, gold — autonomously.",
    body:
      "A Genie-Code-style declarative pipeline ingests the chaotic 10k Excel, parses JSON-array strings, derives a controlled-vocabulary capability tag set, and writes Delta tables governed by Unity Catalog.",
    figure: "ingestion/parser.py",
  },
  {
    n: "II.",
    title: "Multi-agent reasoning",
    deck: "A supervisor and four specialists.",
    body:
      "An Agno-style supervisor orchestrates Diagnostic, Auditing, Spatial, and Evaluator workers via the Model Context Protocol, with dynamic routing across foundation models.",
    figure: "agents/supervisor.py",
  },
  {
    n: "III.",
    title: "Hallucination zero",
    deck: "Chain of Verification, then P(True) × entropy.",
    body:
      "Every claim runs a four-phase CoV protocol — baseline, plan, execute, synthesize — then is gated by a self-verbalised P(True) fused with consistency entropy. Below 0.88 → human steward.",
    figure: "reasoning/chain_of_verification.py",
  },
  {
    n: "IV.",
    title: "Geospatial truth",
    deck: "H3 resolution 7. Gaussian decay.",
    body:
      "Enhanced Two-Step Floating Catchment Area on a hexagonal mesh quantifies medical deserts as precise mathematical objects — bottom-quartile accessibility per capability.",
    figure: "geo/e2sfca.py",
  },
  {
    n: "V.",
    title: "Total observability",
    deck: "Every span, every prompt, every retrieval.",
    body:
      "MLflow 3 tracing captures inputs, outputs, latencies, and retrieved context for every agent invocation. LLM-as-a-Judge feeds back into a continuous improvement loop.",
    figure: "observability/tracing.py",
  },
];

export function Architecture() {
  return (
    <section className="px-6 py-20 max-w-[1600px] mx-auto">
      <div className="border-b border-ink mb-1" />
      <div className="border-b border-ink h-1 mb-10" />

      <div className="grid grid-cols-12 gap-6 lg:gap-10 mb-10">
        <div className="col-span-12 lg:col-span-5">
          <div className="eyebrow mb-2">Part II · the apparatus</div>
          <h2 className="font-display font-bold text-3xl md:text-5xl leading-[0.98] text-balance">
            Five chapters,
            <br />
            <span className="italic text-accent">one reasoning fabric.</span>
          </h2>
        </div>
        <div className="col-span-12 lg:col-span-7 lg:border-l lg:border-rule-strong lg:pl-8">
          <p className="font-display text-[18px] md:text-xl leading-snug text-ink-2 text-balance">
            Each chapter is a small, auditable system. Together they form a
            single pipeline that ingests messy provider data, audits every claim
            against published medical guidance, and emits a geographically
            precise picture of where Indian healthcare is — and isn’t.
          </p>
        </div>
      </div>

      {/* Chapter list */}
      <ol className="border-t border-ink">
        {CHAPTERS.map((c) => (
          <li
            key={c.n}
            className="grid grid-cols-12 gap-6 lg:gap-10 border-b border-rule-strong py-7 hover:bg-paper-2 transition-colors"
          >
            <div className="col-span-2 lg:col-span-1 font-display text-3xl md:text-4xl text-accent leading-none">
              {c.n}
            </div>
            <div className="col-span-10 lg:col-span-4">
              <h3 className="font-display text-2xl md:text-3xl font-bold leading-tight">
                {c.title}
              </h3>
              <p className="font-display italic text-[15px] text-ink-3 mt-1">
                {c.deck}
              </p>
            </div>
            <div className="col-span-12 lg:col-span-5 text-[15px] leading-relaxed text-ink-2">
              {c.body}
            </div>
            <div className="col-span-12 lg:col-span-2 text-right">
              <span className="font-mono text-[11px] text-ink-3">
                {c.figure}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
