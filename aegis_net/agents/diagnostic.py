"""Diagnostic & Capability Agent.

Runs Knowledge-Base Grounded Chain-of-Verification over each facility and
emits the final structured capability list, fully evidence-anchored.
"""
from __future__ import annotations

from typing import Any

from ..reasoning.chain_of_verification import ChainOfVerification
from .base import Agent


class DiagnosticAgent(Agent):
    name = "DiagnosticAgent"
    description = "Runs Chain-of-Verification grounded extraction of facility capabilities."

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cov = ChainOfVerification(self.llm)

    def handle(self, payload: dict[str, Any]) -> dict[str, Any]:
        facility = payload["facility"]
        result = self.cov.run(
            facility_id=facility["facility_id"],
            name=facility.get("name", ""),
            source=facility.get("evidence_text", ""),
        )
        return {"cov": result.to_dict(), "capabilities": result.final_capabilities}
