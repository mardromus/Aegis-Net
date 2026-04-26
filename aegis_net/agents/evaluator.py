"""Evaluator Agent.

Computes the fused P(True) confidence score for every claim emitted by
the Diagnostic Agent and routes low-confidence records to the
human-in-the-loop quarantine queue.
"""
from __future__ import annotations

from typing import Any

from ..config import CFG
from ..reasoning.confidence import fused_confidence
from .base import Agent


class EvaluatorAgent(Agent):
    name = "EvaluatorAgent"
    description = "Self-verbalised P(True) + entropy fusion confidence scorer."

    def handle(self, payload: dict[str, Any]) -> dict[str, Any]:
        capabilities: list[str] = payload.get("capabilities") or []
        source: str = payload.get("evidence_text") or payload.get("source") or ""
        scores: list[dict[str, Any]] = []
        for cap in capabilities:
            fused = fused_confidence(claim=cap, source=source, llm=self.llm)
            scores.append({"capability": cap, **fused})
        quarantined = [s for s in scores if s["fused"] < CFG.reasoning.quarantine_threshold]
        return {
            "scores": scores,
            "quarantine": quarantined,
            "quarantine_threshold": CFG.reasoning.quarantine_threshold,
            "approved": [s for s in scores if s["fused"] >= CFG.reasoning.quarantine_threshold],
        }
