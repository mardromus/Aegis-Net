"""Deterministic procedure -> equipment dependency graph.

Codifies the WHO Surgical Safety Checklist + NABH ICU/OT infrastructure
requirements into a machine-readable form. The Resource Management agent
uses this graph as its source of truth when auditing facilities.

Each entry maps a *capability tag* (controlled vocabulary) to:
    - critical: equipment / staff that MUST be present (else fail audit)
    - recommended: equipment that SHOULD be present
    - reference: WHO/NABH document this rule was derived from
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Dependency:
    critical: tuple[str, ...]
    recommended: tuple[str, ...]
    reference: str


PROCEDURE_DEPENDENCIES: dict[str, Dependency] = {
    "icu": Dependency(
        critical=("ventilator", "multi-parameter monitor", "defibrillator", "central oxygen", "suction unit"),
        recommended=("infusion pump", "abg analyzer", "isolation room", "crash cart"),
        reference="NABH ICU Standards 2020 / ISCCM Consensus 2020",
    ),
    "trauma": Dependency(
        critical=("ct scanner", "x-ray", "operation theater", "ventilator", "blood bank"),
        recommended=("c-arm", "fast ultrasound", "rapid infuser", "trauma bay"),
        reference="WHO Emergency & Trauma Care Standards",
    ),
    "neurosurgery": Dependency(
        critical=("operating microscope", "neuro icu", "ct scanner", "anesthesia machine"),
        recommended=("intra-op mri", "navigation system", "ultrasonic aspirator"),
        reference="WHO Surgical Safety Checklist + NABH OT 2022",
    ),
    "cardiac_surgery": Dependency(
        critical=("cardiac operation theater", "heart-lung machine", "icu", "ventilator", "blood bank"),
        recommended=("cath lab", "echocardiogram", "iabp"),
        reference="WHO Cardiac Surgery Guidelines",
    ),
    "cardiology": Dependency(
        critical=("ecg machine", "echocardiogram", "defibrillator"),
        recommended=("cath lab", "stress test", "holter monitor"),
        reference="NABH Cardiology Guidelines",
    ),
    "robotic_surgery": Dependency(
        critical=("robotic surgical system", "operation theater", "anesthesia machine", "icu"),
        recommended=("c-arm", "operating microscope"),
        reference="FDA / WHO Robotic Surgery Standards",
    ),
    "dialysis": Dependency(
        critical=("dialysis machine", "ro water plant", "trained nephrology nurse"),
        recommended=("isolation room hepatitis", "central oxygen"),
        reference="ISN/NABH Dialysis Unit Guidelines",
    ),
    "oncology": Dependency(
        critical=("chemotherapy daycare", "trained oncologist", "pharmacy"),
        recommended=("linear accelerator", "pet ct", "palliative care"),
        reference="WHO Cancer Control Programme",
    ),
    "maternity": Dependency(
        critical=("labour room", "operation theater", "fetal monitor", "neonatal resuscitation kit"),
        recommended=("nicu", "blood bank", "ultrasound"),
        reference="WHO Safe Childbirth Checklist",
    ),
    "neonatal": Dependency(
        critical=("infant warmer", "neonatal ventilator", "phototherapy unit"),
        recommended=("incubator", "cpap", "central oxygen"),
        reference="NABH NICU Standards",
    ),
    "pediatrics": Dependency(
        critical=("pediatric beds", "pediatrician", "vital signs monitor"),
        recommended=("nebulizer", "pediatric icu"),
        reference="NABH Pediatric Care",
    ),
    "ophthalmology": Dependency(
        critical=("slit lamp", "tonometer", "operation theater"),
        recommended=("oct", "phaco machine", "yag laser"),
        reference="AIOS / NABH Ophthalmology",
    ),
    "orthopedics": Dependency(
        critical=("operation theater", "c-arm", "orthopedic implants", "anesthesia machine"),
        recommended=("arthroscopy tower", "tourniquet", "autoclave"),
        reference="WHO Surgical Safety Checklist",
    ),
    "imaging_ct": Dependency(
        critical=("ct scanner", "radiologist"),
        recommended=("contrast injector", "lead-shielded room"),
        reference="AERB / NABH Imaging",
    ),
    "imaging_mri": Dependency(
        critical=("mri scanner", "radiologist"),
        recommended=("rf shielded room", "anesthesia for pediatric mri"),
        reference="AERB / NABH Imaging",
    ),
    "general_surgery": Dependency(
        critical=("operation theater", "anesthesia machine", "autoclave"),
        recommended=("laparoscopy tower", "electrocautery"),
        reference="WHO Surgical Safety Checklist",
    ),
    "urology": Dependency(
        critical=("operation theater", "endoscopy tower", "anesthesia machine"),
        recommended=("lithotripter", "urodynamic system"),
        reference="USI / NABH Urology",
    ),
    "gastroenterology": Dependency(
        critical=("endoscopy tower", "trained gastroenterologist"),
        recommended=("colonoscope", "ercp", "endoscope reprocessor"),
        reference="ISG / NABH Endoscopy",
    ),
    "pulmonology": Dependency(
        critical=("ventilator", "pulse oximeter", "nebulizer"),
        recommended=("bronchoscope", "spirometer"),
        reference="ICS Guidelines",
    ),
    "blood_bank": Dependency(
        critical=("blood storage refrigerator", "centrifuge", "licensed technician"),
        recommended=("apheresis unit",),
        reference="DCGI Blood Bank Licensing",
    ),
    "ent": Dependency(
        critical=("operation theater", "ent endoscope", "anesthesia machine"),
        recommended=("audiometer", "microdebrider"),
        reference="AOI / NABH ENT",
    ),
    "dental": Dependency(
        critical=("dental chair", "autoclave"),
        recommended=("rvg", "opg", "intra-oral camera"),
        reference="DCI / NABH Dental",
    ),
}


# Heuristic mapping from raw capability strings/tokens to taxonomy tags
def lookup_dependencies(tag: str) -> Dependency | None:
    return PROCEDURE_DEPENDENCIES.get(tag)
