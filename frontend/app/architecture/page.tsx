import Link from "next/link";

/**
 * /architecture — The whole Aegis-Net stack in one editorial page.
 * Designed to be readable in ~60 seconds.
 */
export default function ArchitecturePage() {
  return (
    <article className="px-6 py-10 max-w-[1600px] mx-auto">
      {/* Masthead */}
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <span className="font-display italic text-[15px] text-ink-3">
          Volume V · Architecture &amp; Implementation
        </span>
        <span className="font-mono text-[10px] tracking-widest text-ink-3 uppercase">
          A 60-second briefing
        </span>
      </div>
      <div className="border-b border-ink h-1 mb-10" />

      {/* Hero */}
      <header className="grid grid-cols-12 gap-6 lg:gap-10 mb-10">
        <div className="col-span-12 lg:col-span-8">
          <div className="eyebrow mb-3">The blueprint, in one page</div>
          <h1 className="font-display font-bold text-ink leading-[0.95] text-[3rem] md:text-[4.6rem] tracking-tight text-balance">
            Five layers.
            <br />
            <span className="italic text-accent">One reasoning fabric.</span>
          </h1>
        </div>
        <p className="col-span-12 lg:col-span-4 lg:border-l lg:border-rule-strong lg:pl-6 font-display italic text-[15px] text-ink-3 leading-snug self-end">
          Every component below is implemented, instrumented, and tested. The
          flow runs end-to-end in roughly 90 seconds on a laptop in offline
          mode, or against Databricks Foundation Models in a cluster.
        </p>
      </header>

      {/* === FLOW STRIP === */}
      <Section chapter="Figure I" title="The pipeline — bronze to insight">
        <FlowStrip />
        <p className="mt-4 font-display italic text-ink-3 text-[14px] max-w-3xl">
          Each step is idempotent: data engineering is a Spark Declarative
          Pipeline; the agent swarm streams over the gold table and writes a
          dossier per facility; the geo-engine produces eight per-capability
          accessibility tables.
        </p>
      </Section>

      {/* === AGENT SWARM === */}
      <Section chapter="Figure II" title="The multi-agent swarm">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7 border border-ink p-5 bg-paper-2">
            <SwarmDiagram />
          </div>
          <div className="col-span-12 lg:col-span-5">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-ink text-left">
                  <th className="eyebrow py-2 font-normal">Agent</th>
                  <th className="eyebrow py-2 font-normal">Role</th>
                </tr>
              </thead>
              <tbody>
                <AgentRow
                  name="Supervisor"
                  role="Orchestrates · routes to specialists · emits MLflow spans"
                />
                <AgentRow
                  name="Data Collection"
                  role="Bronze → Silver → Gold normalisation; controlled-vocab tagging"
                />
                <AgentRow
                  name="Diagnostic"
                  role="4-phase Chain of Verification → evidence-grounded capabilities"
                  accent
                />
                <AgentRow
                  name="Evaluator"
                  role="Self-verbalised P(True) × consistency entropy → quarantine gate"
                />
                <AgentRow
                  name="Auditor"
                  role="Cross-references claims against WHO/NABH dependency graph + Vector RAG"
                />
                <AgentRow
                  name="Spatial Routing"
                  role="H3 indexing + E2SFCA accessibility per capability"
                />
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* === REASONING ENGINE === */}
      <Section chapter="Figure III" title="The hallucination-zero engine">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7 border border-ink p-5 bg-paper-2">
            <CoVDiagram />
          </div>
          <div className="col-span-12 lg:col-span-5 border border-rule-strong p-5">
            <div className="eyebrow mb-2">Confidence math</div>
            <p className="font-display text-[15px] text-ink-2 leading-snug">
              Every claim is sampled <b>n=3</b> times at temperature 0.7. The
              fused score combines self-reported probability with the entropy of
              the sample distribution, then thresholded at <b>0.88</b>:
            </p>
            <div className="mt-4 border-y border-rule-strong py-4 text-center">
              <Formula
                expr={`fused = 0.6·μ(p_true) + 0.4·(1 − H̃(samples))`}
              />
              <div className="mt-2 font-mono text-[10px] text-ink-3">
                where H̃ is the normalised binary entropy
              </div>
            </div>
            <p className="mt-4 font-display italic text-[14px] text-ink-3 leading-snug">
              Anything below <b>0.88</b> is quarantined and routed to a
              human-in-the-loop reviewer via the MLflow Review App.
            </p>
          </div>
        </div>
      </Section>

      {/* === GEO MATH === */}
      <Section chapter="Figure IV" title="Naming medical deserts mathematically">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-5 border border-rule-strong p-5">
            <div className="eyebrow mb-2">Enhanced 2-Step Floating Catchment</div>
            <p className="font-display text-[15px] text-ink-2 leading-snug">
              Stage 1 — for every provider <b>j</b>, compute its supply ratio
              over a Gaussian-weighted demand catchment:
            </p>
            <div className="mt-3 border-y border-rule-strong py-4 text-center">
              <Formula expr={`R_j = S_j / Σ_k P_k · f(d_kj)`} />
            </div>
            <p className="mt-3 font-display text-[15px] text-ink-2 leading-snug">
              Stage 2 — for every population hexagon <b>i</b>, sum the
              distance-weighted ratios of all providers in the catchment:
            </p>
            <div className="mt-3 border-y border-rule-strong py-4 text-center">
              <Formula expr={`A_i = Σ_j R_j · f(d_ij)`} />
            </div>
            <p className="mt-3 font-mono text-[11px] text-ink-3">
              f(d) = exp(−d²/2σ²) for d ≤ d₀, else 0  ·  d₀ = 50 km · σ = 20 km
            </p>
          </div>
          <div className="col-span-12 lg:col-span-7 border border-ink p-5 bg-paper-2">
            <H3Diagram />
            <p className="mt-3 font-display italic text-ink-3 text-[13px]">
              All Indian facilities are projected onto an H3 hexagonal mesh at
              resolution 7 (≈ 5 km² cells, ~1.2 km edge) so that postal-code
              and political boundaries don&apos;t distort the math.
            </p>
          </div>
        </div>
      </Section>

      {/* === TRUST SCORER === */}
      <Section chapter="Figure V" title="The Trust Scorer">
        <div className="grid grid-cols-12 gap-6 items-stretch">
          <div className="col-span-12 lg:col-span-7 border border-rule-strong p-5">
            <p className="font-display text-[15px] text-ink-2 leading-snug">
              Three signals fuse into a single 0–1 trust score per facility:
            </p>
            <ul className="mt-3 space-y-1.5 text-[14px]">
              <li className="flex items-baseline gap-3">
                <span className="font-mono text-accent">w_c = 0.25</span>
                <span>completeness · how filled-in is the record</span>
              </li>
              <li className="flex items-baseline gap-3">
                <span className="font-mono text-accent">w_p = 0.50</span>
                <span>mean fused P(True) over CoV-verified claims</span>
              </li>
              <li className="flex items-baseline gap-3">
                <span className="font-mono text-accent">w_x = 0.25</span>
                <span>contradiction penalty (rule + audit-graph hits)</span>
              </li>
            </ul>
            <div className="mt-4 border-y border-rule-strong py-4 text-center">
              <Formula
                expr={`trust = w_c · completeness + w_p · μ(P) − w_x · 0.18·|contradictions|`}
              />
            </div>
            <p className="mt-3 font-mono text-[11px] text-ink-3">
              Bands: ≥0.85 HIGH · ≥0.65 MEDIUM · ≥0.40 LOW · &lt;0.40 QUARANTINED
            </p>
          </div>
          <div className="col-span-12 lg:col-span-5 border border-ink bg-paper-2 p-5">
            <div className="eyebrow mb-2">Live example</div>
            <h4 className="font-display text-2xl font-bold leading-tight">
              A2 PathLabs India
            </h4>
            <p className="text-[13px] text-ink-3 mt-1">Coimbatore · FAC-000061</p>
            <div className="mt-4 grid grid-cols-3 gap-0 border border-ink divide-x divide-rule-strong">
              <Stat label="Trust" value="0.19" tone="accent" />
              <Stat label="Contradict." value="5" tone="accent" />
              <Stat label="Critical gaps" value="4" tone="ochre" />
            </div>
            <p className="mt-3 font-display italic text-[13px] text-ink-3 leading-relaxed">
              Claimed cardiology, ICU, maternity, urology — auditor flagged
              missing anesthesiologist, no ventilator, no maternity equipment.
              <span className="text-accent"> Quarantined.</span>
            </p>
          </div>
        </div>
      </Section>

      {/* === STACK TABLE === */}
      <Section chapter="Figure VI" title="The stack, layer by layer">
        <table className="w-full text-[13px] border-y border-ink">
          <thead>
            <tr className="border-b border-rule-strong text-left">
              <th className="eyebrow py-2 pl-3 font-normal w-[140px]">Layer</th>
              <th className="eyebrow py-2 font-normal w-[260px]">Tool</th>
              <th className="eyebrow py-2 font-normal">Role in Aegis-Net</th>
              <th className="eyebrow py-2 pr-3 font-normal w-[180px]">Source path</th>
            </tr>
          </thead>
          <tbody>
            <StackRow
              layer="Compute"
              tool="Databricks Lakehouse · Free Edition"
              role="Unity Catalog governance, serverless compute, Delta tables"
              path="databricks.yml · notebooks/"
            />
            <StackRow
              layer="Data eng"
              tool="Genie Code · Spark Declarative Pipelines"
              role="Bronze → Silver → Gold ingestion + capability normalisation"
              path="aegis_net/ingestion/"
            />
            <StackRow
              layer="Knowledge"
              tool="Mosaic AI Vector Search (FAISS / BM25 fallback)"
              role="WHO + NABH + AERB + ICMR corpus, embedded + queryable"
              path="aegis_net/knowledge/"
            />
            <StackRow
              layer="Reasoning"
              tool="Chain-of-Verification + P(True) × entropy fusion"
              role="Hallucination-zero capability extraction with calibrated confidence"
              path="aegis_net/reasoning/"
            />
            <StackRow
              layer="Agents"
              tool="Agno Supervisor-Worker on Agent Bricks"
              role="Five specialised agents with MCP tool access + dynamic model routing"
              path="aegis_net/agents/"
            />
            <StackRow
              layer="Geo"
              tool="H3 res-7 mesh · E2SFCA Gaussian decay"
              role="Per-capability accessibility scoring + medical desert detection"
              path="aegis_net/geo/"
            />
            <StackRow
              layer="Observability"
              tool="MLflow 3 GenAI tracing"
              role="Every span captured; persistent JSONL mirror for offline mode"
              path="aegis_net/observability/"
            />
            <StackRow
              layer="API"
              tool="FastAPI · pydantic"
              role="13 typed endpoints — stats, dossier, geo, traces, agents/run"
              path="backend/main.py"
            />
            <StackRow
              layer="Frontend"
              tool="Next.js 15 · React 19 · MapLibre · Tailwind"
              role="Editorial command centre: dashboard, atlas, dossiers, reasoning, traces"
              path="frontend/"
            />
            <StackRow
              layer="Trust"
              tool="9 contradiction rules + WHO/NABH dependency graph"
              role="Row-level Trust Scorer with citations and band assignment"
              path="aegis_net/trust/"
            />
          </tbody>
        </table>
      </Section>

      {/* === LIVE NUMBERS === */}
      <Section chapter="Figure VII" title="The receipts">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-rule-strong border-y border-ink">
          <BigStat label="Facilities audited" value="10,000" />
          <BigStat label="States &amp; UTs" value="35" />
          <BigStat label="In a dialysis desert" value="69.6%" tone="accent" />
          <BigStat label="Tests passing" value="13/13" tone="moss" />
        </div>
      </Section>

      {/* CTA */}
      <div className="mt-12 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 lg:col-start-3 text-center">
          <p className="font-display italic text-[19px] text-ink-2 leading-snug">
            From a static list of 10,000 buildings, to a living intelligence
            network that knows where the help is — and where it needs to go.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/dashboard" className="btn btn-accent">
              Read the briefing →
            </Link>
            <Link href="/dossier" className="btn">
              Browse the dossiers
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ----------------------------- helpers ---------------------------------- */

function Section({
  chapter,
  title,
  children,
}: {
  chapter: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="border-b border-ink pb-2 mb-6 flex items-baseline justify-between">
        <div>
          <div className="eyebrow">{chapter}</div>
          <h2 className="font-display font-bold text-2xl md:text-3xl mt-0.5">
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function AgentRow({ name, role, accent }: { name: string; role: string; accent?: boolean }) {
  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className="py-2.5 pr-3 font-display font-semibold align-top whitespace-nowrap">
        {accent ? <span className="text-accent">{name}</span> : name}
      </td>
      <td className="py-2.5 text-ink-2 leading-snug">{role}</td>
    </tr>
  );
}

function StackRow({
  layer,
  tool,
  role,
  path,
}: {
  layer: string;
  tool: string;
  role: string;
  path: string;
}) {
  return (
    <tr className="border-b border-rule last:border-b-0 hover:bg-paper-2">
      <td className="py-2.5 pl-3 align-top">
        <span className="eyebrow">{layer}</span>
      </td>
      <td className="py-2.5 align-top font-display font-semibold">{tool}</td>
      <td className="py-2.5 align-top text-ink-2 leading-snug">{role}</td>
      <td className="py-2.5 pr-3 align-top font-mono text-[11px] text-ink-3">{path}</td>
    </tr>
  );
}

function Formula({ expr }: { expr: string }) {
  return (
    <code className="font-mono text-[15px] md:text-[17px] text-ink tracking-tight">
      {expr}
    </code>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "ochre";
}) {
  const c = tone === "accent" ? "text-accent" : tone === "ochre" ? "text-ochre" : "text-ink";
  return (
    <div className="px-3 py-3">
      <div className={`num-display text-2xl font-bold ${c}`}>{value}</div>
      <div className="eyebrow mt-1">{label}</div>
    </div>
  );
}

function BigStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "moss";
}) {
  const c = tone === "accent" ? "text-accent" : tone === "moss" ? "text-moss" : "text-ink";
  return (
    <div className="px-5 py-7">
      <div className="eyebrow" dangerouslySetInnerHTML={{ __html: label }} />
      <div className={`num-display text-[3rem] md:text-[3.6rem] font-bold mt-1 ${c}`}>
        {value}
      </div>
    </div>
  );
}

/* ----------------------------- diagrams --------------------------------- */

function FlowStrip() {
  const steps = [
    { n: "01", label: "Bronze", sub: "raw 10k Excel" },
    { n: "02", label: "Silver", sub: "parsed + normed" },
    { n: "03", label: "Gold", sub: "+H3 + tags" },
    { n: "04", label: "Vector", sub: "WHO/NABH RAG" },
    { n: "05", label: "Swarm", sub: "5 agents · CoV" },
    { n: "06", label: "Audit", sub: "P(true) gate" },
    { n: "07", label: "Geo", sub: "E2SFCA on H3" },
    { n: "08", label: "UI", sub: "atlas · dossier" },
  ];
  return (
    <div className="border border-ink bg-paper-2 grid grid-cols-4 md:grid-cols-8 divide-x divide-rule-strong">
      {steps.map((s, i) => (
        <div key={s.n} className="px-3 py-4 relative">
          <span className="font-mono text-[10px] tracking-widest text-ink-3">
            {s.n}
          </span>
          <div className="font-display font-bold text-base mt-1">{s.label}</div>
          <div className="text-[11px] text-ink-3 mt-0.5 leading-tight">{s.sub}</div>
          {i < steps.length - 1 && (
            <span className="hidden md:block absolute right-[-7px] top-1/2 -translate-y-1/2 text-accent text-lg leading-none pointer-events-none">
              ›
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function SwarmDiagram() {
  return (
    <svg viewBox="0 0 600 320" className="w-full h-auto" role="img" aria-label="Multi-agent topology">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#1A1612" />
        </marker>
      </defs>

      {/* Supervisor */}
      <g>
        <rect x="240" y="20" width="120" height="60" fill="#1A1612" stroke="#1A1612" strokeWidth="2" />
        <text x="300" y="46" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="18" fontWeight="700" fill="#F4ECDC">
          Supervisor
        </text>
        <text x="300" y="68" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="2" fill="#E2D6BA">
          AGNO
        </text>
      </g>

      {/* Lines to workers */}
      {[60, 200, 340, 480].map((x, i) => (
        <line
          key={i}
          x1="300"
          y1="80"
          x2={x + 60}
          y2="170"
          stroke="#1A1612"
          strokeWidth="1.4"
          markerEnd="url(#arrow)"
        />
      ))}

      {/* Workers */}
      {[
        { x: 30, label: "Diagnostic", sub: "CoV", accent: true },
        { x: 170, label: "Evaluator", sub: "P(True)" },
        { x: 310, label: "Auditor", sub: "WHO/NABH" },
        { x: 450, label: "Spatial", sub: "H3 + E2SFCA" },
      ].map((w, i) => (
        <g key={i}>
          <rect
            x={w.x}
            y="170"
            width="120"
            height="60"
            fill="#F4ECDC"
            stroke={w.accent ? "#B43A26" : "#1A1612"}
            strokeWidth={w.accent ? "2.5" : "1.5"}
          />
          <text x={w.x + 60} y="195" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="15" fontWeight="700" fill={w.accent ? "#B43A26" : "#1A1612"}>
            {w.label}
          </text>
          <text x={w.x + 60} y="215" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="1.5" fill="#6E6354">
            {w.sub}
          </text>
        </g>
      ))}

      {/* Tools row */}
      <line x1="0" y1="270" x2="600" y2="270" stroke="rgba(26,22,18,0.32)" strokeDasharray="3,3" />
      <text x="300" y="290" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" letterSpacing="3" fill="#6E6354">
        VIA MODEL CONTEXT PROTOCOL
      </text>
      <text x="300" y="310" textAnchor="middle" fontFamily="Fraunces, serif" fontStyle="italic" fontSize="13" fill="#3A332A">
        Mosaic AI Vector Search · Foundation Models · Geo APIs · Unity Catalog
      </text>
    </svg>
  );
}

function CoVDiagram() {
  const phases = [
    { n: "01", t: "Baseline draft", d: "extract candidate capabilities from evidence text" },
    { n: "02", t: "Verification plan", d: "auto-generate atomic challenge questions" },
    { n: "03", t: "Independent execute", d: "answer each, cite the literal source span" },
    { n: "04", t: "Synthesis · prune", d: "drop every claim that didn't survive verification" },
  ];
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {phases.map((p, i) => (
          <div key={p.n} className="border border-ink bg-paper px-3 py-3 relative">
            <div className="font-mono text-[10px] tracking-widest text-accent">{p.n}</div>
            <div className="font-display font-bold text-[15px] mt-1 leading-tight">
              {p.t}
            </div>
            <div className="text-[11px] text-ink-3 mt-1 leading-snug">{p.d}</div>
            {i < phases.length - 1 && (
              <span className="hidden md:block absolute right-[-12px] top-1/2 -translate-y-1/2 text-accent text-lg leading-none">
                ›
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 text-[11px] font-mono text-ink-3 leading-relaxed">
        ↪ output: <span className="text-ink">final_capabilities</span>, <span className="text-ink">pruned</span>, <span className="text-ink">reasoning_trace</span>
      </div>
    </div>
  );
}

function H3Diagram() {
  // Simple SVG showing a small H3-like hex grid with a coloured gradient
  const cells: { cx: number; cy: number; t: number }[] = [];
  const size = 22;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 9; c++) {
      const cx = 40 + c * (size * Math.sqrt(3)) + (r % 2) * (size * Math.sqrt(3) / 2);
      const cy = 40 + r * (size * 1.5);
      // distance from center
      const dx = cx - 270;
      const dy = cy - 110;
      const d = Math.sqrt(dx * dx + dy * dy);
      cells.push({ cx, cy, t: Math.min(1, d / 200) });
    }
  }
  function hexPath(cx: number, cy: number, s: number): string {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pts.push(`${cx + s * Math.cos(a)},${cy + s * Math.sin(a)}`);
    }
    return `M${pts.join("L")}Z`;
  }
  function colourFor(t: number): string {
    // 0 = moss (well served), 1 = vermillion (desert)
    if (t < 0.33) return "#4A6E4A";
    if (t < 0.66) return "#A77523";
    return "#B43A26";
  }

  return (
    <svg viewBox="0 0 540 220" className="w-full h-auto" role="img" aria-label="H3 hex grid sample">
      {cells.map((c, i) => (
        <path
          key={i}
          d={hexPath(c.cx, c.cy, size)}
          fill={colourFor(c.t)}
          fillOpacity={0.85}
          stroke="#1A1612"
          strokeWidth="0.6"
        />
      ))}
      {/* anchor */}
      <circle cx="270" cy="110" r="6" fill="#1A1612" stroke="#F4ECDC" strokeWidth="2" />
      {/* legend */}
      <g transform="translate(20,200)">
        <rect width="20" height="6" fill="#4A6E4A" />
        <text x="26" y="6" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#3A332A">well-served</text>
        <rect x="120" width="20" height="6" fill="#A77523" />
        <text x="146" y="6" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#3A332A">borderline</text>
        <rect x="240" width="20" height="6" fill="#B43A26" />
        <text x="266" y="6" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#3A332A">desert</text>
      </g>
    </svg>
  );
}
