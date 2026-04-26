"""Bronze -> Silver -> Gold normalisation, mirroring a Lakeflow Spark
Declarative Pipeline that Genie Code would generate autonomously.

Local mode writes parquet under data/{bronze,silver,gold}; on Databricks
the same DataFrames can be persisted to Delta tables under Unity Catalog.
"""
from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd

from ..config import CFG
from .parser import canonical_state, explode_lists, normalize_capabilities

log = logging.getLogger(__name__)


def build_bronze(xlsx_path: Path | None = None) -> pd.DataFrame:
    """Bronze: raw ingest of the Virtue Foundation spreadsheet."""
    xlsx_path = xlsx_path or CFG.raw_xlsx
    log.info("[bronze] reading %s", xlsx_path)
    df = pd.read_excel(xlsx_path)
    df.columns = [c.strip() for c in df.columns]
    df["facility_id"] = df.index.astype(str).str.zfill(6).map(lambda i: f"FAC-{i}")
    # Coerce mixed-type object columns to strings for parquet stability
    for c in df.columns:
        if df[c].dtype == object:
            df[c] = df[c].astype(str).where(df[c].notna(), None)
    out = CFG.bronze_dir / "facilities_bronze.parquet"
    df.to_parquet(out, index=False)
    log.info("[bronze] wrote %s rows=%d", out, len(df))
    return df


def build_silver(bronze: pd.DataFrame | None = None) -> pd.DataFrame:
    """Silver: clean types, parse JSON-array strings, derive controlled vocab."""
    if bronze is None:
        bronze = pd.read_parquet(CFG.bronze_dir / "facilities_bronze.parquet")
    log.info("[silver] cleaning %d rows", len(bronze))
    df = explode_lists(bronze)

    # Numeric coercion
    for col in ("latitude", "longitude", "numberDoctors", "capacity", "yearEstablished"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Drop rows missing geocoordinates (cannot map them)
    df = df.dropna(subset=["latitude", "longitude"]).copy()
    df = df[(df["latitude"].between(-90, 90)) & (df["longitude"].between(-180, 180))]

    # Canonicalise the state/UT label (collapses 194 dirty variants to the
    # actual 28 states + 8 UTs of India). Unrecognisable values become "Other".
    if "address_stateOrRegion" in df.columns:
        df["address_state_raw"] = df["address_stateOrRegion"]
        canon = df["address_stateOrRegion"].apply(canonical_state)
        df["address_stateOrRegion"] = canon.fillna("Other")

    # Build a single normalised "evidence" text blob per facility -> the source
    # text the Diagnostic Agent will ground itself in.
    def _evidence(row: pd.Series) -> str:
        chunks = [
            row.get("name") or "",
            row.get("description") or "",
            "Specialties: " + ", ".join(row.get("specialties") or []),
            "Procedures: " + ", ".join(row.get("procedure") or []),
            "Equipment: " + ", ".join(row.get("equipment") or []),
            "Capabilities: " + ", ".join(row.get("capability") or []),
        ]
        return "\n".join(c for c in chunks if c and c.strip(": "))

    df["evidence_text"] = df.apply(_evidence, axis=1)

    # Controlled-vocabulary capability tags (deterministic baseline; agents refine)
    df["raw_capability_tags"] = df.apply(
        lambda r: normalize_capabilities(
            (r.get("specialties") or [])
            + (r.get("procedure") or [])
            + (r.get("equipment") or [])
            + (r.get("capability") or [])
            + [r.get("description") or ""]
        ),
        axis=1,
    )

    out = CFG.silver_dir / "facilities_silver.parquet"
    df.to_parquet(out, index=False)
    log.info("[silver] wrote %s rows=%d", out, len(df))
    return df


def build_gold(silver: pd.DataFrame | None = None) -> pd.DataFrame:
    """Gold: facility table ready for the multi-agent swarm + geo engine.

    Adds:
      * H3 index at configured resolution
      * Crude trust signals computed deterministically (agents will refine)
    """
    if silver is None:
        silver = pd.read_parquet(CFG.silver_dir / "facilities_silver.parquet")
    log.info("[gold] enriching %d rows", len(silver))

    df = silver.copy()
    try:
        import h3

        res = CFG.geo.h3_resolution
        df["h3_index"] = [
            h3.latlng_to_cell(float(lat), float(lng), res)
            for lat, lng in zip(df["latitude"], df["longitude"])
        ]
    except Exception as e:  # pragma: no cover
        log.warning("h3 not available, skipping (%s)", e)
        df["h3_index"] = None

    # Crude completeness score (proxy for trust before agents run)
    completeness_cols = ["specialties", "procedure", "equipment", "capability", "description"]
    df["completeness_score"] = df[completeness_cols].apply(
        lambda r: float(np.mean([1.0 if (isinstance(v, list) and v) or (isinstance(v, str) and v.strip()) else 0.0 for v in r])),
        axis=1,
    )

    out = CFG.gold_dir / "facilities_gold.parquet"
    df.to_parquet(out, index=False)
    log.info("[gold] wrote %s rows=%d cols=%d", out, len(df), len(df.columns))
    return df
