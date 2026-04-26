"""Supervisor Agent — central orchestrator of the Aegis-Net swarm.

For each facility:
    DiagnosticAgent  -> produce evidence-grounded capabilities (CoV)
    EvaluatorAgent   -> P(True) + consistency fusion confidence
    AuditingAgent    -> WHO/NABH dependency-graph audit + Vector retrieval
    TrustScorer      -> per-row trust score + contradictions

Returns a single JSON dossier per facility plus aggregate stats. The
Supervisor is also responsible for routing tasks to the correct Foundation
Model endpoint (Agent Bricks multi-AI orchestration).
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Iterable

import pandas as pd

from ..llm.client import get_llm
from ..observability.tracing import trace_span
from ..trust.trust_scorer import TrustScorer
from .auditing import AuditingAgent
from .base import Agent
from .diagnostic import DiagnosticAgent
from .evaluator import EvaluatorAgent

log = logging.getLogger(__name__)


class SupervisorAgent(Agent):
    name = "SupervisorAgent"
    description = "Central orchestrator coordinating Aegis-Net's specialist swarm."

    def __init__(self, max_workers: int = 8):
        super().__init__()
        self.diagnostic = DiagnosticAgent(llm=get_llm())
        self.evaluator = EvaluatorAgent(llm=get_llm())
        self.auditing = AuditingAgent(llm=get_llm())
        self.trust = TrustScorer()
        self.max_workers = max_workers

    def process_facility(self, facility: dict[str, Any]) -> dict[str, Any]:
        with trace_span("Supervisor.process_facility", {"facility_id": facility.get("facility_id")}):
            diag = self.diagnostic({"facility": facility})
            capabilities = diag.get("capabilities", [])

            evald = self.evaluator(
                {"capabilities": capabilities, "evidence_text": facility.get("evidence_text", "")}
            )
            audit = self.auditing({"facility": facility, "capabilities": capabilities})
            trust = self.trust.score(facility=facility, capabilities=capabilities, audit=audit, evaluation=evald)

            return {
                "facility_id": facility.get("facility_id"),
                "name": facility.get("name"),
                "address_city": facility.get("address_city"),
                "address_state": facility.get("address_stateOrRegion"),
                "latitude": facility.get("latitude"),
                "longitude": facility.get("longitude"),
                "h3_index": facility.get("h3_index"),
                "diagnostic": diag,
                "evaluation": evald,
                "audit": audit,
                "trust": trust,
            }

    @staticmethod
    def _row_to_dict(row: pd.Series) -> dict[str, Any]:
        d = row.to_dict()
        for k, v in list(d.items()):
            if hasattr(v, "tolist"):
                try:
                    d[k] = v.tolist()
                except Exception:
                    d[k] = list(v) if hasattr(v, "__iter__") else v
        return d

    def handle(self, payload: dict[str, Any]) -> dict[str, Any]:
        gold: pd.DataFrame = payload["gold"]
        sample = payload.get("sample")
        if sample:
            gold = gold.head(int(sample))
        records: list[dict[str, Any]] = [self._row_to_dict(r) for _, r in gold.iterrows()]

        results: list[dict[str, Any]] = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as ex:
            futs = {ex.submit(self.process_facility, r): r for r in records}
            for fut in as_completed(futs):
                try:
                    results.append(fut.result())
                except Exception as e:  # pragma: no cover
                    log.warning("Facility processing failed: %s", e)

        df = pd.DataFrame(results)
        return {
            "dossier": results,
            "dossier_df": df,
            "facility_count": len(results),
        }
