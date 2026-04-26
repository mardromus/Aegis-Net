"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { useApi } from "@/lib/api";
import { nf } from "@/lib/utils";

type Span = {
  name: string;
  start: number;
  duration_ms: number | null;
  inputs: unknown;
  outputs: unknown;
};

type TracesResponse = {
  traces: Span[];
};

const AGENT_FLOW = [
  { id: "DataCollectionAgent", label: "Data Collection" },
  { id: "DiagnosticAgent", label: "Diagnostic / CoV" },
  { id: "EvaluatorAgent", label: "Evaluator P(True)" },
  { id: "AuditingAgent", label: "WHO/NABH Audit" },
  { id: "SpatialAgent", label: "Spatial Routing" },
];

const TICK = { fill: "#6E6354", fontFamily: "JetBrains Mono", fontSize: 10 };

export default function TracesPage() {
  const { data } = useApi<TracesResponse>("/api/traces?limit=300", {
    refreshInterval: 5000,
  });

  const spans = data?.traces ?? [];
  const recent = spans.slice(-30).reverse();

  const byAgent: Record<string, { count: number; sum: number }> = {};
  for (const s of spans) {
    const name = s.name.split(".")[0];
    byAgent[name] = byAgent[name] || { count: 0, sum: 0 };
    byAgent[name].count += 1;
    byAgent[name].sum += s.duration_ms ?? 0;
  }
  const agentChart = Object.entries(byAgent)
    .map(([name, v]) => ({
      name,
      avg_ms: v.count ? v.sum / v.count : 0,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="px-6 py-10 max-w-[1600px] mx-auto">
      <div className="border-b border-ink mb-1" />
      <div className="border-b border-ink h-1 mb-8" />

      <div className="grid grid-cols-12 gap-6 mb-10">
        <div className="col-span-12 lg:col-span-7">
          <div className="eyebrow mb-2">Part IV · the reasoning log</div>
          <h1 className="font-display font-bold text-4xl md:text-6xl leading-[0.95] text-balance">
            What the agents
            <br />
            are <span className="italic text-accent">thinking.</span>
          </h1>
        </div>
        <p className="col-span-12 lg:col-span-5 lg:border-l lg:border-rule-strong lg:pl-6 font-display italic text-[15px] text-ink-3 leading-snug self-end">
          Every agent invocation, every tool call, every LLM hop is captured by
          the MLflow tracer (or its in-memory mirror). This page refreshes every
          five seconds.
        </p>
      </div>

      {/* Topology strip — supervisor -> workers */}
      <div className="border border-ink p-4 mb-6 bg-paper-2">
        <div className="flex items-baseline justify-between mb-4 border-b border-rule pb-2">
          <div>
            <div className="eyebrow">Figure I</div>
            <h3 className="font-display text-xl font-bold mt-0.5">
              Supervisor → Worker topology
            </h3>
          </div>
          <span className="font-mono text-[10px] text-ink-3">
            agno · supervisor-worker
          </span>
        </div>
        <div className="grid grid-cols-12 gap-4 items-center">
          <div className="col-span-2 text-center border border-ink py-4 px-2 bg-paper">
            <div className="font-display font-bold text-lg leading-none">
              Supervisor
            </div>
            <div className="font-mono text-[10px] text-ink-3 mt-2">
              {byAgent["SupervisorAgent"]?.count ?? 0} runs
            </div>
          </div>
          <div className="col-span-10 grid grid-cols-5 gap-2 relative">
            <div className="absolute top-1/2 -left-2 right-0 h-px bg-ink -z-0" />
            {AGENT_FLOW.map((a) => {
              const runs = byAgent[a.id]?.count ?? 0;
              return (
                <div
                  key={a.id}
                  className="relative z-10 border border-ink bg-paper py-3 px-2 text-center"
                >
                  <div className="font-display text-[14px] leading-tight">
                    {a.label}
                  </div>
                  <div className="font-mono text-[10px] text-ink-3 mt-1.5">
                    {runs} runs
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-7">
          <div className="flex items-baseline justify-between border-b border-ink pb-2">
            <div>
              <div className="eyebrow">Figure II</div>
              <h3 className="font-display text-xl font-bold mt-0.5">
                Average latency per agent
              </h3>
            </div>
            <span className="font-mono text-[10px] text-ink-3">milliseconds</span>
          </div>
          {agentChart.length > 0 ? (
            <div className="h-[300px] pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentChart} margin={{ top: 8, right: 12, bottom: 56, left: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={TICK}
                    axisLine={{ stroke: "#1A1612" }}
                    tickLine={false}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#F4ECDC",
                      border: "1px solid #1A1612",
                      borderRadius: 0,
                      fontSize: 11,
                      fontFamily: "JetBrains Mono",
                      color: "#1A1612",
                      boxShadow: "3px 3px 0 #1A1612",
                    }}
                    cursor={{ fill: "rgba(180,58,38,0.08)" }}
                  />
                  <Bar dataKey="avg_ms">
                    {agentChart.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#B43A26" : "#1A1612"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] grid place-items-center font-display italic text-ink-3 text-sm">
              Run the swarm to populate traces.
            </div>
          )}
        </section>

        <section className="col-span-12 lg:col-span-5">
          <div className="flex items-baseline justify-between border-b border-ink pb-2">
            <div>
              <div className="eyebrow">Figure III</div>
              <h3 className="font-display text-xl font-bold mt-0.5">
                Recent spans
              </h3>
            </div>
            <span className="font-mono text-[10px] text-ink-3">
              n = {nf(spans.length)} · auto-refresh 5s
            </span>
          </div>
          <ul className="border-b border-rule">
            {recent.map((s, i) => (
              <li
                key={i}
                className="grid grid-cols-12 items-center text-[13px] py-1.5 px-1 border-b border-rule last:border-b-0"
              >
                <span className="col-span-1 font-mono text-[10px] text-ink-4">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="col-span-9 font-mono text-ink truncate">
                  {s.name}
                </span>
                <span className="col-span-2 text-right font-mono text-ink-3">
                  {s.duration_ms !== null ? `${s.duration_ms.toFixed(0)} ms` : "—"}
                </span>
              </li>
            ))}
            {recent.length === 0 && (
              <li className="font-display italic text-ink-3 text-sm py-4 text-center">
                No spans captured yet.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
