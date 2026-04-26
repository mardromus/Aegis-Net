"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { DossierDetail } from "@/lib/api";

const PHASES = [
  { key: "baseline", label: "I · Baseline draft" },
  { key: "plan", label: "II · Verification plan" },
  { key: "execute", label: "III · Independent execution" },
  { key: "synthesis", label: "IV · Synthesis & pruning" },
];

export function CovTimeline({ cov }: { cov: DossierDetail["diagnostic"]["cov"] }) {
  return (
    <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
      {PHASES.map((phase, i) => {
        const trace = cov.reasoning_trace.find((t) => t.phase === phase.key);
        return (
          <div key={phase.key} className="relative pl-6 border-l border-rule-strong">
            <span className="absolute -left-[5px] top-1.5 h-2 w-2 bg-accent" />
            {i < PHASES.length - 1 && (
              <span className="absolute -left-px top-3 bottom-[-22px] w-px bg-rule" />
            )}
            <div className="font-display italic text-[13px] text-ink-3 mb-1.5">
              {phase.label}
            </div>
            <PhasePayload phase={phase.key} trace={trace} cov={cov} />
          </div>
        );
      })}
    </div>
  );
}

function PhasePayload({
  phase,
  trace,
  cov,
}: {
  phase: string;
  trace?: { phase: string; [k: string]: unknown };
  cov: DossierDetail["diagnostic"]["cov"];
}) {
  if (phase === "baseline") {
    return (
      <div>
        <div className="text-[13px] text-ink-2 mb-2">
          Drafted{" "}
          <span className="font-mono text-ink">{cov.baseline.length}</span>{" "}
          candidate capabilities from the raw evidence text.
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cov.baseline.map((b) => (
            <span key={b} className="tag">{b}</span>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "plan") {
    return (
      <div>
        <div className="text-[13px] text-ink-2 mb-2">
          Auto-generated{" "}
          <span className="font-mono text-ink">{cov.questions.length}</span>{" "}
          atomic verification questions.
        </div>
        <ol className="space-y-1.5 text-[13px]">
          {cov.questions.slice(0, 8).map((q, i) => (
            <li key={i} className="flex gap-2 text-ink-2">
              <span className="font-mono text-[11px] text-ink-3 w-5 shrink-0">
                {String(i + 1).padStart(2, "0")}.
              </span>
              <span className="font-display italic">{q}</span>
            </li>
          ))}
          {cov.questions.length > 8 && (
            <li className="font-mono text-[11px] text-ink-3">
              + {cov.questions.length - 8} more
            </li>
          )}
        </ol>
      </div>
    );
  }

  if (phase === "execute") {
    return (
      <div className="space-y-1.5">
        {cov.answers.slice(0, 8).map((a, i) => (
          <div key={i} className="border border-rule bg-paper-2 px-2.5 py-2 flex items-start gap-2">
            {a.supported ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-moss mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
            )}
            <div className="flex-1 text-[13px] leading-snug">
              <div className="text-ink-2">{a.question}</div>
              {a.evidence && a.supported && (
                <div className="font-display italic text-[12px] text-ink-3 mt-0.5">
                  ↳ {a.evidence}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (phase === "synthesis") {
    const kept = (trace?.kept as string[]) ?? cov.final_capabilities;
    const pruned = (trace?.pruned as string[]) ?? cov.pruned;
    return (
      <div className="space-y-3">
        <div>
          <div className="font-display text-moss text-[13px] mb-1">
            Kept ({kept.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {kept.map((k) => (
              <span
                key={k}
                className="tag"
                style={{ borderColor: "#4A6E4A", color: "#4A6E4A", background: "rgba(74,110,74,0.08)" }}
              >
                {k}
              </span>
            ))}
          </div>
        </div>
        {pruned.length > 0 && (
          <div>
            <div className="font-display text-accent text-[13px] mb-1">
              Pruned ({pruned.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pruned.map((k) => (
                <span key={k} className="tag line-through opacity-60">
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
