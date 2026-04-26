"""Resource Management & Auditing Agent.

Cross-references extracted capabilities against the WHO/NABH dependency
graph and the Mosaic AI Vector Search corpus. Produces a structured audit
report with COMPLIANT / FLAGGED / CRITICAL_GAP findings.
"""
from __future__ import annotations

import re
from dataclasses import asdict
from typing import Any

from ..ingestion.parser import normalize_capabilities
from ..knowledge.taxonomy import PROCEDURE_DEPENDENCIES, lookup_dependencies
from ..knowledge.vector_store import VectorStore
from .base import Agent


class AuditingAgent(Agent):
    name = "AuditingAgent"
    description = "Audits surgical/clinical readiness against WHO + NABH dependency graphs."

    def __init__(self, *args, vector_store: VectorStore | None = None, **kwargs):
        super().__init__(*args, **kwargs)
        self.store = vector_store or VectorStore()

    @staticmethod
    def _has(text: str, term: str) -> bool:
        # liberal match on stem
        t = re.sub(r"[^a-z0-9]+", " ", term.lower())
        words = [w for w in t.split() if len(w) > 3]
        if not words:
            return term.lower() in text
        return all(w in text for w in words[:2])

    def handle(self, payload: dict[str, Any]) -> dict[str, Any]:
        facility = payload["facility"]
        capabilities: list[str] = payload.get("capabilities") or []
        evidence = (facility.get("evidence_text") or "").lower()

        # Map free-form caps -> taxonomy tags (or use already-normalised tags)
        tags = sorted(set(normalize_capabilities(capabilities) + (facility.get("raw_capability_tags") or [])))

        findings: list[dict[str, Any]] = []
        for tag in tags:
            dep = lookup_dependencies(tag)
            if dep is None:
                continue

            # Vector-search retrieval to enrich the audit with authoritative text
            retrieved = self.store.search(f"{tag} infrastructure requirements", k=2)

            missing_critical = [c for c in dep.critical if not self._has(evidence, c)]
            missing_recommended = [c for c in dep.recommended if not self._has(evidence, c)]

            if missing_critical:
                status = "CRITICAL_GAP"
            elif missing_recommended:
                status = "FLAGGED"
            else:
                status = "COMPLIANT"

            findings.append(
                {
                    "capability": tag,
                    "status": status,
                    "missing_critical": missing_critical,
                    "missing_recommended": missing_recommended,
                    "reference": dep.reference,
                    "retrieved_evidence": [r.to_dict() for r in retrieved],
                }
            )

        # Aggregate audit-level summary
        total = max(len(findings), 1)
        compliant = sum(1 for f in findings if f["status"] == "COMPLIANT")
        flagged = sum(1 for f in findings if f["status"] == "FLAGGED")
        critical = sum(1 for f in findings if f["status"] == "CRITICAL_GAP")

        compliance_index = round((compliant + 0.5 * flagged) / total, 4)

        return {
            "audit_findings": findings,
            "summary": {
                "tags_audited": len(findings),
                "compliant": compliant,
                "flagged": flagged,
                "critical_gaps": critical,
                "compliance_index": compliance_index,
            },
        }
