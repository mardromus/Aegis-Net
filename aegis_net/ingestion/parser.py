"""Robust parsers for the chaotic Indian healthcare facility dataset.

The raw Virtue Foundation export stores list-valued fields (specialties,
procedure, equipment, capability, websites, ...) as JSON-array *strings*
that are not always valid JSON. We need a parser that never throws, copes
with single quotes, embedded quotes, trailing commas and unicode glyphs.
"""
from __future__ import annotations

import ast
import json
import re
from typing import Any, Iterable

import numpy as np
import pandas as pd

_LIST_FIELDS = (
    "phone_numbers",
    "websites",
    "specialties",
    "procedure",
    "equipment",
    "capability",
    "affiliationTypeIds",
)


def _coerce_str(x: Any) -> str:
    if x is None:
        return ""
    if isinstance(x, float) and (np.isnan(x) if isinstance(x, float) else False):
        return ""
    return str(x)


def parse_array_string(value: Any) -> list[str]:
    """Parse a list-as-string into a clean Python list. Never raises."""
    if value is None:
        return []
    if isinstance(value, list):
        return [_coerce_str(v).strip() for v in value if _coerce_str(v).strip()]
    if isinstance(value, float) and pd.isna(value):
        return []
    s = _coerce_str(value).strip()
    if not s or s.lower() in {"nan", "none", "null", "[]"}:
        return []

    # Try strict JSON
    for loader in (json.loads, ast.literal_eval):
        try:
            parsed = loader(s)
            if isinstance(parsed, (list, tuple)):
                return [_coerce_str(v).strip() for v in parsed if _coerce_str(v).strip()]
            if isinstance(parsed, str):
                return [parsed.strip()] if parsed.strip() else []
        except Exception:
            continue

    # Fallback: strip brackets/quotes and split
    inner = re.sub(r"^[\[\(]|[\]\)]$", "", s)
    parts = re.split(r"\",\s*\"|\',\s*\'|\s*,\s*", inner)
    out: list[str] = []
    for p in parts:
        cleaned = p.strip().strip('"').strip("'").strip()
        if cleaned and cleaned.lower() not in {"nan", "none"}:
            out.append(cleaned)
    return out


def explode_lists(df: pd.DataFrame) -> pd.DataFrame:
    """Convert all list-valued string columns into real Python lists."""
    df = df.copy()
    for col in _LIST_FIELDS:
        if col in df.columns:
            df[col] = df[col].apply(parse_array_string)
    return df


# --- Light-weight clinical taxonomy normaliser --------------------------------
# Maps common Indian-English procedure phrases to a controlled vocabulary that
# downstream agents and the auditor can reason about deterministically.

CAPABILITY_VOCAB: dict[str, tuple[str, ...]] = {
    "icu": ("icu", "intensive care", "critical care", "ccu", "iccu", "hdu"),
    "trauma": ("trauma", "polytrauma", "emergency trauma", "level 1 trauma"),
    "neurosurgery": ("neuro surgery", "neurosurgery", "brain surgery", "spine surgery", "craniotomy"),
    "cardiac_surgery": ("cabg", "open heart", "bypass surgery", "cardiothoracic", "cardiac surgery"),
    "cardiology": ("cardiology", "echocardiogram", "ecg", "ekg", "angiography", "angioplasty"),
    "robotic_surgery": ("robotic", "mako", "cori", "da vinci", "navio"),
    "dialysis": ("dialysis", "haemodialysis", "hemodialysis", "renal replacement"),
    "oncology": ("oncology", "chemotherapy", "radiotherapy", "cancer", "tumor", "tumour"),
    "maternity": ("maternity", "labour", "labor", "delivery", "obstetric", "antenatal", "lscs", "c-section"),
    "neonatal": ("nicu", "neonatal", "newborn", "premature"),
    "pediatrics": ("pediatric", "paediatric", "children"),
    "ophthalmology": ("ophthalmology", "cataract", "lasik", "retina", "glaucoma", "vitreoretinal"),
    "orthopedics": ("orthopedic", "orthopaedic", "knee replacement", "hip replacement", "arthroscopy"),
    "ent": (" ent ", "ear nose throat", "otolaryngology", "rhinoplasty"),
    "dental": ("dental", "dentistry", "endodontics", "orthodontics", "root canal"),
    "imaging_ct": ("ct scan", "ct imaging", "computed tomography", "cbct"),
    "imaging_mri": (" mri ", "mri scan", "magnetic resonance"),
    "imaging_xray": ("x-ray", "xray", "radiography"),
    "imaging_usg": ("ultrasound", "usg", "sonography", "doppler"),
    "general_surgery": ("general surgery", "appendectomy", "appendicectomy", "hernia", "laparoscop"),
    "urology": ("urology", "nephrectomy", "lithotripsy", "tur"),
    "gastroenterology": ("gastro", "endoscopy", "colonoscopy", "ercp"),
    "pulmonology": ("pulmonology", "respiratory", "ventilator", "bipap"),
    "psychiatry": ("psychiatry", "mental health", "deaddiction", "rehab"),
    "ayurveda": ("ayurved", "panchakarma", "ayush"),
    "homeopathy": ("homeopath", "homoeopath"),
    "physiotherapy": ("physiotherap", "rehabilitation"),
    "blood_bank": ("blood bank", "transfusion"),
    "ambulance": ("ambulance", "108", "emergency response"),
    "pharmacy": ("pharmacy", "chemist", "drug store"),
    "lab": ("pathology", "laboratory", " lab ", "diagnostic lab"),
}


def normalize_capabilities(items: Iterable[str]) -> list[str]:
    """Map free-form capability phrases to controlled vocabulary tags."""
    text = " ".join(items).lower()
    text = " " + re.sub(r"[^a-z0-9]+", " ", text) + " "
    tags: list[str] = []
    for tag, kws in CAPABILITY_VOCAB.items():
        if any(kw in text for kw in kws):
            tags.append(tag)
    return sorted(set(tags))


# ---------------------------------------------------------------------------
# Indian state / UT canonicalisation
# ---------------------------------------------------------------------------
# India has 28 states + 8 union territories (as of 2024). The raw dataset
# uses many variants (abbreviations, alternate spellings, trailing whitespace,
# colloquial names). This map collapses everything to the official label.

INDIAN_STATES: tuple[str, ...] = (
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
)

INDIAN_UTS: tuple[str, ...] = (
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
)

INDIAN_REGIONS: tuple[str, ...] = INDIAN_STATES + INDIAN_UTS

# Aliases / common variants. Keys are lowercased, punctuation-stripped tokens.
_STATE_ALIASES: dict[str, str] = {
    # States
    "andhra": "Andhra Pradesh",
    "andhrapradesh": "Andhra Pradesh",
    "ap": "Andhra Pradesh",
    "arunachal": "Arunachal Pradesh",
    "assam": "Assam",
    "bihar": "Bihar",
    "chhattisgarh": "Chhattisgarh",
    "chattisgarh": "Chhattisgarh",
    "cg": "Chhattisgarh",
    "goa": "Goa",
    "gujarat": "Gujarat",
    "gujrat": "Gujarat",
    "gj": "Gujarat",
    "haryana": "Haryana",
    "hr": "Haryana",
    "himachal": "Himachal Pradesh",
    "himachalpradesh": "Himachal Pradesh",
    "hp": "Himachal Pradesh",
    "jharkhand": "Jharkhand",
    "jh": "Jharkhand",
    "karnataka": "Karnataka",
    "ka": "Karnataka",
    "kerala": "Kerala",
    "kl": "Kerala",
    "madhyapradesh": "Madhya Pradesh",
    "madhya": "Madhya Pradesh",
    "mp": "Madhya Pradesh",
    "maharashtra": "Maharashtra",
    "maharastra": "Maharashtra",
    "mh": "Maharashtra",
    "manipur": "Manipur",
    "meghalaya": "Meghalaya",
    "mizoram": "Mizoram",
    "nagaland": "Nagaland",
    "odisha": "Odisha",
    "orissa": "Odisha",
    "od": "Odisha",
    "punjab": "Punjab",
    "pb": "Punjab",
    "rajasthan": "Rajasthan",
    "rj": "Rajasthan",
    "sikkim": "Sikkim",
    "tamilnadu": "Tamil Nadu",
    "tamil": "Tamil Nadu",
    "tn": "Tamil Nadu",
    "telangana": "Telangana",
    "telengana": "Telangana",
    "tg": "Telangana",
    "ts": "Telangana",
    "tripura": "Tripura",
    "uttarpradesh": "Uttar Pradesh",
    "uttar": "Uttar Pradesh",
    "up": "Uttar Pradesh",
    "uttarakhand": "Uttarakhand",
    "uttaranchal": "Uttarakhand",
    "uk": "Uttarakhand",
    "westbengal": "West Bengal",
    "bengal": "West Bengal",
    "wb": "West Bengal",
    # UTs
    "andamanandnicobarislands": "Andaman and Nicobar Islands",
    "andamannicobar": "Andaman and Nicobar Islands",
    "andaman": "Andaman and Nicobar Islands",
    "nicobar": "Andaman and Nicobar Islands",
    "an": "Andaman and Nicobar Islands",
    "chandigarh": "Chandigarh",
    "ch": "Chandigarh",
    "dadraandnagarhaveliandamananddiu": "Dadra and Nagar Haveli and Daman and Diu",
    "dadraandnagarhaveli": "Dadra and Nagar Haveli and Daman and Diu",
    "damananddiu": "Dadra and Nagar Haveli and Daman and Diu",
    "daman": "Dadra and Nagar Haveli and Daman and Diu",
    "diu": "Dadra and Nagar Haveli and Daman and Diu",
    "dn": "Dadra and Nagar Haveli and Daman and Diu",
    "dd": "Dadra and Nagar Haveli and Daman and Diu",
    "delhi": "Delhi",
    "newdelhi": "Delhi",
    "nctofdelhi": "Delhi",
    "nct": "Delhi",
    "dl": "Delhi",
    "jammuandkashmir": "Jammu and Kashmir",
    "jammukashmir": "Jammu and Kashmir",
    "jammu": "Jammu and Kashmir",
    "kashmir": "Jammu and Kashmir",
    "jk": "Jammu and Kashmir",
    "ladakh": "Ladakh",
    "la": "Ladakh",
    "lakshadweep": "Lakshadweep",
    "ld": "Lakshadweep",
    "puducherry": "Puducherry",
    "pondicherry": "Puducherry",
    "py": "Puducherry",
}

# Build full lookup keyed by canonical lowercase
_STATE_LOOKUP: dict[str, str] = dict(_STATE_ALIASES)
for r in INDIAN_REGIONS:
    _STATE_LOOKUP[re.sub(r"[^a-z0-9]+", "", r.lower())] = r


def canonical_state(value: Any) -> str | None:
    """Return the canonical India state / UT name, or None if unrecognised."""
    if value is None:
        return None
    s = _coerce_str(value).strip()
    if not s or s.lower() in {"nan", "none", "null"}:
        return None
    key = re.sub(r"[^a-z0-9]+", "", s.lower())
    if not key:
        return None
    if key in _STATE_LOOKUP:
        return _STATE_LOOKUP[key]
    # try matching by prefix (e.g. "uttar pradesh ", "kerala state")
    for k, v in _STATE_LOOKUP.items():
        if len(k) >= 4 and key.startswith(k):
            return v
    return None
