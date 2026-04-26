"""Knowledge-Base Grounded Chain of Verification (CoV).

Four-phase pipeline:
    1. BASELINE  : draft capability list from source text
    2. PLAN      : auto-generate atomic verification questions
    3. EXECUTE   : answer each question, citing evidentiary spans
    4. SYNTHESIS : prune unsupported claims & emit final JSON
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any

from ..ingestion.parser import normalize_capabilities
from ..llm.client import LLMClient, get_llm

log = logging.getLogger(__name__)


@dataclass
class CoVResult:
    facility_id: str
    baseline: list[str]
    questions: list[str]
    answers: list[dict[str, Any]]
    final_capabilities: list[str]
    pruned: list[str]
    reasoning_trace: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "facility_id": self.facility_id,
            "baseline": self.baseline,
            "questions": self.questions,
            "answers": self.answers,
            "final_capabilities": self.final_capabilities,
            "pruned": self.pruned,
            "reasoning_trace": self.reasoning_trace,
        }


_BASELINE_SYS = "You are the Diagnostic Agent of Aegis-Net. Extract structured capabilities for the facility based ONLY on the provided source evidence. Output strict JSON."
_BASELINE_USR = """Diagnostic Agent: extract structured capabilities.
Return JSON: {{"capabilities": [<short capability names>], "rationale": "<2 sentences>"}}.
Use only what is supported by the SOURCE.

FACILITY: {name}
SOURCE:
{source}
"""

_QGEN_SYS = "You are the Verification Planner of Aegis-Net's Chain of Verification protocol."
_QGEN_USR = """Generate atomic verification questions to challenge the draft capability list.
Each question must be answerable solely from the SOURCE text and target ONE claim.
Return JSON: {{"questions": ["...", "..."]}}

DRAFT CAPABILITIES:
{capabilities}

SOURCE:
{source}
"""

_EXEC_SYS = "You are the Verification Executor of Aegis-Net. Answer each verification question strictly from the SOURCE."
_EXEC_USR = """Answer each verification question. For each question, output a JSON object with keys
"question", "supported" (true|false), and "evidence" (exact phrase from SOURCE or empty).
Return JSON of the form: {{"answers": [...]}}.

SOURCE:
{source}

QUESTIONS:
{questions}
"""


class ChainOfVerification:
    def __init__(self, llm: LLMClient | None = None):
        self.llm = llm or get_llm()

    # --- helpers --------------------------------------------------------
    @staticmethod
    def _safe_json(text: str) -> dict[str, Any]:
        try:
            return json.loads(text)
        except Exception:
            m = re.search(r"\{.*\}", text, re.S)
            if m:
                try:
                    return json.loads(m.group(0))
                except Exception:
                    return {}
            return {}

    # --- pipeline -------------------------------------------------------
    def run(self, *, facility_id: str, name: str, source: str) -> CoVResult:
        trace: list[dict[str, Any]] = []

        # Phase 1: baseline draft
        r1 = self.llm.chat(
            messages=[
                {"role": "system", "content": _BASELINE_SYS},
                {"role": "user", "content": _BASELINE_USR.format(name=name, source=source[:6000])},
            ],
            temperature=0.1,
            json_mode=True,
            max_tokens=800,
        )
        d1 = self._safe_json(r1.text) or r1.raw
        baseline = list(d1.get("capabilities") or [])
        # Always seed with deterministic vocab tags so we can audit even if LLM under-extracts
        seeded = sorted(set([*baseline, *normalize_capabilities([source])]))
        trace.append({"phase": "baseline", "model": r1.model, "provider": r1.provider, "output": d1})

        # Phase 2: question planning
        bullet = "\n".join(f"- {c}" for c in seeded) or "- (no draft capabilities)"
        r2 = self.llm.chat(
            messages=[
                {"role": "system", "content": _QGEN_SYS},
                {"role": "user", "content": _QGEN_USR.format(capabilities=bullet, source=source[:4000])},
            ],
            temperature=0.2,
            json_mode=True,
            max_tokens=600,
        )
        d2 = self._safe_json(r2.text) or r2.raw
        questions = list(d2.get("questions") or [])
        if not questions:
            questions = [f"Does the SOURCE explicitly mention '{c}'?" for c in seeded[:8]]
        trace.append({"phase": "plan", "model": r2.model, "provider": r2.provider, "output": d2})

        # Phase 3: execute
        qblock = "\n".join(f"{i+1}. {q}" for i, q in enumerate(questions))
        r3 = self.llm.chat(
            messages=[
                {"role": "system", "content": _EXEC_SYS},
                {"role": "user", "content": _EXEC_USR.format(source=source[:6000], questions=qblock)},
            ],
            temperature=0.0,
            json_mode=True,
            max_tokens=1200,
        )
        d3 = self._safe_json(r3.text) or r3.raw
        answers = list(d3.get("answers") or [])
        trace.append({"phase": "execute", "model": r3.model, "provider": r3.provider, "output": d3})

        # Phase 4: synthesis & pruning
        kept: list[str] = []
        pruned: list[str] = []
        ans_by_idx = {i: a for i, a in enumerate(answers)}
        # naive alignment: if Q references a capability literal, that capability is supported iff supported=true
        for cap in seeded:
            cap_norm = cap.lower()
            supported = False
            for a in answers:
                q = (a.get("question") or "").lower()
                if cap_norm and cap_norm in q and a.get("supported"):
                    supported = True
                    break
            if supported:
                kept.append(cap)
            else:
                # final fallback: did the source mention any token of the capability?
                src = source.lower()
                tokens = [t for t in re.findall(r"[a-z0-9]+", cap_norm) if len(t) >= 3]
                if tokens and any(t in src for t in tokens):
                    kept.append(cap)
                else:
                    pruned.append(cap)
        trace.append({"phase": "synthesis", "kept": kept, "pruned": pruned})

        return CoVResult(
            facility_id=facility_id,
            baseline=seeded,
            questions=questions,
            answers=answers,
            final_capabilities=kept,
            pruned=pruned,
            reasoning_trace=trace,
        )
