"""Trust Scorer — flags suspicious or incomplete facility records.

Combines three signals into a single 0..1 ``trust_score``:

    1. Completeness signal     -> how filled-in is the record?
    2. Confidence signal       -> mean fused P(True) over claims
    3. Contradiction signal    -> rule-based mismatches between claims and
                                  required equipment / staff

Plus an explicit ``contradictions`` list with row-level citations so a
human reviewer can verify everything.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from statistics import mean
from typing import Any


@dataclass
class TrustReport:
    facility_id: str
    trust_score: float
    completeness: float
    avg_confidence: float
    contradiction_penalty: float
    contradictions: list[dict[str, Any]] = field(default_factory=list)
    citations: list[dict[str, Any]] = field(default_factory=list)
    band: str = "UNKNOWN"

    def to_dict(self) -> dict[str, Any]:
        return self.__dict__.copy()


# Common red-flag rules: (claim_keyword, required_keyword_in_evidence, contradiction_message)
CONTRADICTION_RULES: list[tuple[str, list[str], str]] = [
    ("advanced surgery", ["anesthesi", "anaesth"], "Claims advanced surgery but lists no anesthesiologist/anaesthetist."),
    ("icu", ["ventilator", "monitor"], "ICU claimed without ventilator or multi-parameter monitor."),
    ("trauma", ["x-ray", "ct ", "ultrasound"], "Trauma capability claimed without basic imaging (X-ray/CT/USG)."),
    ("robotic", ["robot", "mako", "cori", "da vinci"], "Robotic surgery claimed but no robotic system referenced."),
    ("dialysis", ["dialysis", "ro plant"], "Dialysis claimed but no dialysis machine or RO plant referenced."),
    ("oncology", ["chemo", "radiotherapy", "linac"], "Oncology claimed but no chemo/radiotherapy infrastructure."),
    ("nicu", ["incubator", "ventilator", "warmer"], "NICU claimed but no neonatal warmers/ventilators referenced."),
    ("blood bank", ["refrigerator", "centrifuge", "blood"], "Blood bank claimed without storage/centrifuge equipment."),
    ("24/7", ["emergency", "ambulance", "icu"], "24x7 claim without emergency/ambulance/ICU evidence."),
]


class TrustScorer:
    def __init__(self, weight_completeness: float = 0.25, weight_confidence: float = 0.5, weight_contradictions: float = 0.25):
        self.w_c = weight_completeness
        self.w_p = weight_confidence
        self.w_x = weight_contradictions

    @staticmethod
    def _completeness(facility: dict[str, Any]) -> float:
        cols = ["specialties", "procedure", "equipment", "capability", "description", "phone_numbers", "websites", "numberDoctors", "capacity"]
        present = 0
        for c in cols:
            v = facility.get(c)
            try:
                if v is None:
                    continue
                if isinstance(v, (list, tuple, set)):
                    if len(v) > 0:
                        present += 1
                elif hasattr(v, "size"):  # numpy array
                    if int(getattr(v, "size", 0)) > 0:
                        present += 1
                elif isinstance(v, str):
                    if v.strip() and v.lower() not in {"nan", "none"}:
                        present += 1
                elif isinstance(v, float):
                    if not math.isnan(v):
                        present += 1
                else:
                    present += 1
            except Exception:
                continue
        return present / len(cols)

    @staticmethod
    def _avg_confidence(evaluation: dict[str, Any]) -> float:
        scores = [s.get("fused", 0.5) for s in evaluation.get("scores", [])]
        return float(mean(scores)) if scores else 0.5

    def _contradictions(self, facility: dict[str, Any], capabilities: list[str]) -> list[dict[str, Any]]:
        ev = (facility.get("evidence_text") or "").lower()
        out: list[dict[str, Any]] = []
        joint = " ".join(capabilities).lower() + " " + ev
        for keyword, required, msg in CONTRADICTION_RULES:
            if keyword in joint:
                if not any(req in ev for req in required):
                    # find the citation snippet that triggered the claim
                    snippet = ""
                    m = re.search(rf".{{0,80}}{re.escape(keyword)}.{{0,80}}", ev)
                    if m:
                        snippet = m.group(0).strip()
                    out.append({"rule": keyword, "message": msg, "citation": snippet})
        return out

    def score(self, *, facility: dict[str, Any], capabilities: list[str], audit: dict[str, Any], evaluation: dict[str, Any]) -> dict[str, Any]:
        comp = self._completeness(facility)
        conf = self._avg_confidence(evaluation)
        contradictions = self._contradictions(facility, capabilities)
        # also pull critical gaps from auditor as contradictions
        for f in audit.get("audit_findings", []):
            if f["status"] == "CRITICAL_GAP":
                contradictions.append(
                    {
                        "rule": f"{f['capability']}_missing_critical",
                        "message": f"{f['capability']}: missing critical equipment {f['missing_critical']}",
                        "citation": f["reference"],
                    }
                )
        contradiction_penalty = min(1.0, 0.18 * len(contradictions))

        trust = max(0.0, self.w_c * comp + self.w_p * conf - self.w_x * contradiction_penalty)
        if trust >= 0.85:
            band = "HIGH_TRUST"
        elif trust >= 0.65:
            band = "MEDIUM_TRUST"
        elif trust >= 0.4:
            band = "LOW_TRUST"
        else:
            band = "QUARANTINED"

        # row-level citations for transparency
        citations: list[dict[str, Any]] = []
        ev = facility.get("evidence_text") or ""
        for cap in capabilities[:12]:
            tok = re.findall(r"[a-z0-9]+", cap.lower())
            tok = [t for t in tok if len(t) > 3]
            for t in tok:
                m = re.search(rf".{{0,60}}{re.escape(t)}.{{0,60}}", ev, re.I)
                if m:
                    citations.append({"capability": cap, "evidence_span": m.group(0).strip()})
                    break

        return TrustReport(
            facility_id=facility.get("facility_id", ""),
            trust_score=round(trust, 4),
            completeness=round(comp, 4),
            avg_confidence=round(conf, 4),
            contradiction_penalty=round(contradiction_penalty, 4),
            contradictions=contradictions,
            citations=citations,
            band=band,
        ).to_dict()
