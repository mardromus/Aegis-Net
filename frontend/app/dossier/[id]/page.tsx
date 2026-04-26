"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileWarning,
} from "lucide-react";
import { useApi, type DossierDetail } from "@/lib/api";
import { cn, statusClass, titleCase, trustClass, trustSwatch } from "@/lib/utils";
import { CovTimeline } from "@/components/dossier/CovTimeline";
import { ConfidenceChart } from "@/components/dossier/ConfidenceChart";

export default function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, error, isLoading } = useApi<DossierDetail>(`/api/dossier/${id}`, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    errorRetryCount: 0,
  });

  if (isLoading) {
    return (
      <div className="px-6 py-12 max-w-[1200px] mx-auto">
        <div className="border border-ink pb-2 mb-1 flex items-baseline justify-between">
          <span className="font-mono text-[10px] tracking-widest text-ink-3 uppercase">
            Auditing facility
          </span>
          <span className="font-mono text-[10px] tracking-widest text-ink-3 uppercase">
            № {id}
          </span>
        </div>
        <div className="border-b border-ink h-1 mb-8" />
        <div className="flex items-center gap-3 mb-6 text-sm text-ink-2">
          <div className="h-3 w-3 rounded-full border border-accent border-t-transparent animate-spin" />
          <span>
            Running Aegis-Net swarm — Diagnostic → Evaluator → Auditor → Trust
            Scorer. This usually takes 1–4 seconds.
          </span>
        </div>
        <div className="border border-rule-strong h-32 mb-4 animate-slowfade bg-paper-2" />
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-rule-strong h-64 animate-slowfade bg-paper-2" />
          <div className="border border-rule-strong h-64 animate-slowfade bg-paper-2" />
          <div className="border border-rule-strong h-64 animate-slowfade bg-paper-2" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-6 py-16 max-w-2xl mx-auto text-center">
        <FileWarning className="h-10 w-10 mx-auto text-ink-3 mb-4" />
        <p className="font-display text-xl">Dossier not found.</p>
        <Link href="/dossier" className="link mt-4 inline-block text-sm">
          Back to all dossiers
        </Link>
      </div>
    );
  }

  const findings = data.audit.audit_findings;
  const compliantCount = findings.filter((f) => f.status === "COMPLIANT").length;
  const flaggedCount = findings.filter((f) => f.status === "FLAGGED").length;
  const criticalCount = findings.filter((f) => f.status === "CRITICAL_GAP").length;

  return (
    <article className="px-6 py-10 max-w-[1400px] mx-auto">
      <div className="flex items-baseline justify-between border-b border-ink pb-2 mb-1">
        <Link
          href="/dossier"
          className="inline-flex items-center gap-2 text-xs text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="font-display italic">All dossiers</span>
        </Link>
        <span className="font-mono text-[10px] tracking-widest text-ink-3 uppercase">
          Dossier № {data.facility_id}
        </span>
      </div>
      <div className="border-b border-ink h-1 mb-8" />

      {/* Hero — facility name as a magazine headline */}
      <header className="grid grid-cols-12 gap-6 mb-10">
        <div className="col-span-12 lg:col-span-8">
          <div className="eyebrow mb-2">
            {data.address_city}, {data.address_state} · H3 {data.h3_index ?? "—"}
          </div>
          <h1 className="font-display font-bold leading-[0.96] text-balance text-[2.6rem] md:text-[4.2rem]">
            {data.name}.
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn("tag capitalize", trustClass(data.trust.band))}>
              <span className={cn("inline-block h-2 w-2 mr-1", trustSwatch(data.trust.band))} />
              {data.trust.band.replace("_", " ").toLowerCase()}
            </span>
            <span className="tag">trust {data.trust.trust_score.toFixed(2)}</span>
            <span className="tag">
              compliance {(data.audit.summary.compliance_index * 100).toFixed(0)}%
            </span>
            <span className="tag">
              P(True) avg {data.trust.avg_confidence.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 grid grid-cols-3 gap-0 border border-ink divide-x divide-rule-strong">
          <MicroStat label="Compliant" value={compliantCount} />
          <MicroStat label="Flagged" value={flaggedCount} accent="ochre" />
          <MicroStat label="Critical gaps" value={criticalCount} accent="accent" />
        </div>
      </header>

      {/* Three columns of evidence */}
      <div className="grid grid-cols-12 gap-6 mb-10">
        <Section
          title="CoV-verified capabilities"
          chapter="Figure I"
          className="col-span-12 lg:col-span-4"
        >
          {data.diagnostic.capabilities.length === 0 ? (
            <span className="font-display italic text-ink-3 text-sm">
              No capabilities survived verification.
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.diagnostic.capabilities.map((c) => (
                <span key={c} className="tag tag-accent">{c}</span>
              ))}
            </div>
          )}
          {data.diagnostic.cov.pruned.length > 0 && (
            <div className="mt-4 border-t border-rule pt-3">
              <div className="eyebrow mb-1">Pruned (failed verification)</div>
              <div className="flex flex-wrap gap-1.5">
                {data.diagnostic.cov.pruned.map((c) => (
                  <span key={c} className="tag line-through opacity-60">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section
          title="Evidence citations"
          chapter="Figure II"
          className="col-span-12 lg:col-span-4"
        >
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {data.trust.citations.length === 0 && (
              <div className="font-display italic text-ink-3 text-sm">
                No citation spans extracted.
              </div>
            )}
            {data.trust.citations.map((c, i) => (
              <div key={i} className="border-l-2 border-accent-2 pl-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-accent-2 mb-0.5">
                  {c.capability}
                </div>
                <div className="font-display italic text-[14px] text-ink-2 leading-snug">
                  &ldquo;…{c.evidence_span}…&rdquo;
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Trust scorer contradictions"
          chapter="Figure III"
          className="col-span-12 lg:col-span-4"
        >
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {data.trust.contradictions.length === 0 ? (
              <div className="font-display italic text-ink-3 text-sm">
                No contradictions flagged.
              </div>
            ) : (
              data.trust.contradictions.map((c, i) => (
                <div key={i} className="border-l-2 border-accent pl-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-accent mb-0.5">
                    {c.rule}
                  </div>
                  <div className="text-[13px] text-ink-2 leading-snug">{c.message}</div>
                  {c.citation && (
                    <div className="mt-1 text-[12px] text-ink-3 italic font-display">
                      ↳ {c.citation}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Section>
      </div>

      {/* Confidence + CoV timeline side-by-side */}
      <div className="grid grid-cols-12 gap-6 mb-10">
        <Section
          title="P(True) × consistency fusion"
          chapter="Figure IV"
          className="col-span-12 lg:col-span-6"
        >
          <ConfidenceChart
            scores={data.evaluation.scores}
            threshold={data.evaluation.quarantine_threshold}
          />
        </Section>

        <Section
          title="Chain of Verification trace"
          chapter="Figure V"
          className="col-span-12 lg:col-span-6"
        >
          <CovTimeline cov={data.diagnostic.cov} />
        </Section>
      </div>

      {/* WHO/NABH audit findings */}
      <Section title="WHO + NABH audit findings" chapter="Figure VI" className="col-span-12">
        <div className="grid gap-2">
          {findings.length === 0 && (
            <div className="font-display italic text-ink-3 text-sm">
              No capability tags matched our taxonomy graph for this facility.
            </div>
          )}
          {findings.map((f, i) => (
            <details
              key={i}
              className="group border border-rule-strong open:border-ink bg-paper-2 open:bg-paper"
            >
              <summary className="cursor-pointer flex items-center justify-between gap-3 list-none px-3 py-2.5">
                <div className="flex items-center gap-3">
                  {f.status === "COMPLIANT" && <CheckCircle2 className="h-4 w-4 text-moss" />}
                  {f.status === "FLAGGED" && <AlertTriangle className="h-4 w-4 text-ochre" />}
                  {f.status === "CRITICAL_GAP" && <XCircle className="h-4 w-4 text-accent" />}
                  <span className="font-display capitalize text-[15px]">
                    {titleCase(f.capability)}
                  </span>
                  <span className={cn("tag capitalize", statusClass(f.status))}>
                    {f.status.replace("_", " ").toLowerCase()}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-ink-3">{f.reference}</span>
              </summary>
              <div className="px-3 pb-3 pl-10 space-y-2 text-[13px] border-t border-rule">
                {f.missing_critical.length > 0 && (
                  <div className="text-accent pt-2">
                    <span className="font-medium">Missing critical:</span>{" "}
                    <span className="font-mono">{f.missing_critical.join(", ")}</span>
                  </div>
                )}
                {f.missing_recommended.length > 0 && (
                  <div className="text-ochre">
                    <span className="font-medium">Missing recommended:</span>{" "}
                    <span className="font-mono">{f.missing_recommended.join(", ")}</span>
                  </div>
                )}
                {f.retrieved_evidence.length > 0 && (
                  <div className="mt-2 border-t border-rule pt-2">
                    <div className="eyebrow mb-1.5">Vector-retrieved guideline</div>
                    {f.retrieved_evidence.map((r, ri) => (
                      <div key={ri} className="mb-2">
                        <div className="text-accent-2 text-[12px] font-medium">
                          {r.title}
                        </div>
                        <div className="font-display italic text-ink-2 mt-0.5 text-[13px] leading-snug">
                          &ldquo;{r.text.slice(0, 320)}…&rdquo;
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      </Section>
    </article>
  );
}

function Section({
  title,
  chapter,
  className,
  children,
}: {
  title: string;
  chapter: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col", className)}>
      <div className="flex items-baseline justify-between border-b border-ink pb-2 mb-3">
        <div>
          <div className="eyebrow">{chapter}</div>
          <h3 className="font-display text-xl font-bold leading-tight mt-0.5">
            {title}
          </h3>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function MicroStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "ochre" | "accent";
}) {
  const colour =
    accent === "ochre" ? "text-ochre" : accent === "accent" ? "text-accent" : "text-ink";
  return (
    <div className="px-3 py-3">
      <div className={`num-display text-3xl font-bold ${colour}`}>{value}</div>
      <div className="eyebrow mt-1">{label}</div>
    </div>
  );
}
