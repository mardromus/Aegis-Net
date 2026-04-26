"""Aegis-Net FastAPI backend.

Exposes the pipeline outputs (gold facilities, dossier, E2SFCA accessibility,
trace buffer, configuration) as a typed JSON API consumable by the Next.js
frontend.

Launch:
    python -m uvicorn backend.main:app --reload --port 8000
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from aegis_net.config import CFG  # noqa: E402
from aegis_net.geo.h3_index import haversine_km  # noqa: E402
from aegis_net.observability.tracing import current_trace  # noqa: E402

log = logging.getLogger("aegis.api")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Aegis-Net API",
    version="1.0.0",
    description="Compound AI for Indian healthcare logistics & medical desert eradication.",
)


@app.on_event("startup")
def _prewarm() -> None:
    """Eagerly load parquet caches so the first user request is instant.

    Also runs a small handful of sample audits so the /api/traces endpoint
    is never empty on first page load — the user sees a populated agent
    chain-of-thought immediately.
    """
    try:
        _Cache.gold_df()
        _Cache.dossier_df()
        _Cache.list_capabilities()
        log.info("Pre-warmed caches (gold, dossier, capabilities).")
    except Exception as e:  # pragma: no cover
        log.warning("Pre-warm failed (will lazy-load): %s", e)

    try:
        gold = _Cache.gold_df()
        sup = _get_supervisor()
        seed_ids = ["FAC-000035", "FAC-000061", "FAC-001754", "FAC-007731"]
        for fid in seed_ids:
            row = gold[gold["facility_id"] == fid]
            if row.empty:
                continue
            facility = {
                k: (v.tolist() if hasattr(v, "tolist") else v)
                for k, v in row.iloc[0].to_dict().items()
            }
            try:
                sup.process_facility(facility)
            except Exception:
                pass
        log.info("Seeded trace buffer with %d facility audits.", len(seed_ids))
    except Exception as e:  # pragma: no cover
        log.warning("Trace seed failed: %s", e)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------- helpers -----------------------------------
def _safe(obj: Any) -> Any:
    """Coerce numpy / pandas scalars to JSON-serialisable plain Python."""
    if obj is None:
        return None
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        f = float(obj)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, np.ndarray):
        return [_safe(x) for x in obj.tolist()]
    if isinstance(obj, (list, tuple)):
        return [_safe(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _safe(v) for k, v in obj.items()}
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, (str, int, bool)):
        return obj
    return str(obj)


def _df_records(df: pd.DataFrame, columns: list[str] | None = None) -> list[dict[str, Any]]:
    if columns:
        df = df[[c for c in columns if c in df.columns]]
    return _safe(df.to_dict(orient="records"))


# ----------------------------- caches ------------------------------------
class _Cache:
    gold: pd.DataFrame | None = None
    dossier: pd.DataFrame | None = None
    e2sfca: dict[str, pd.DataFrame] = {}
    capabilities: list[str] = []

    @classmethod
    def gold_df(cls) -> pd.DataFrame:
        if cls.gold is None:
            p = CFG.gold_dir / "facilities_gold.parquet"
            if not p.exists():
                raise HTTPException(status_code=503, detail="gold table missing — run scripts/run_pipeline.py --data-only")
            cls.gold = pd.read_parquet(p)
        return cls.gold

    @classmethod
    def dossier_df(cls) -> pd.DataFrame:
        if cls.dossier is None:
            p = CFG.gold_dir / "facility_dossier.parquet"
            if p.exists():
                df = pd.read_parquet(p)
                # Pre-compute commonly accessed scalar fields ONCE so every
                # /api/dossier request is O(rows) lookup instead of O(rows*lambda).
                if not df.empty:
                    df["band"] = df["trust"].apply(lambda t: t.get("band", ""))
                    df["score"] = df["trust"].apply(lambda t: t.get("trust_score", 0.0))
                    df["compliance"] = df["audit"].apply(lambda a: a.get("summary", {}).get("compliance_index", 0.0))
                    df["contradictions"] = df["trust"].apply(lambda t: len(t.get("contradictions", [])))
                    df["audited_count"] = df["audit"].apply(lambda a: a.get("summary", {}).get("tags_audited", 0))
                    df["critical_gaps"] = df["audit"].apply(lambda a: a.get("summary", {}).get("critical_gaps", 0))
                    df["caps"] = df["diagnostic"].apply(lambda d: list(d.get("capabilities", [])))
                cls.dossier = df
            else:
                cls.dossier = pd.DataFrame()
        return cls.dossier

    @classmethod
    def e2sfca_df(cls, capability: str) -> pd.DataFrame:
        if capability not in cls.e2sfca:
            p = CFG.gold_dir / f"e2sfca_{capability}.parquet"
            if not p.exists():
                raise HTTPException(status_code=404, detail=f"no E2SFCA output for capability={capability}")
            cls.e2sfca[capability] = pd.read_parquet(p)
        return cls.e2sfca[capability]

    @classmethod
    def list_capabilities(cls) -> list[str]:
        if not cls.capabilities:
            cls.capabilities = sorted([
                p.stem.replace("e2sfca_", "") for p in CFG.gold_dir.glob("e2sfca_*.parquet")
            ])
        return cls.capabilities

    @classmethod
    def clear(cls) -> None:
        cls.gold = None
        cls.dossier = None
        cls.e2sfca.clear()
        cls.capabilities = []


# ----------------------------- root --------------------------------------
@app.get("/")
def root():
    return {
        "name": "Aegis-Net API",
        "version": "1.0.0",
        "endpoints": [
            "/api/stats",
            "/api/config",
            "/api/capabilities",
            "/api/facilities",
            "/api/facilities/{id}",
            "/api/dossier",
            "/api/dossier/{id}",
            "/api/geo/desert/{capability}",
            "/api/geo/providers/{capability}",
            "/api/traces",
            "/api/search",
        ],
    }


# ----------------------------- stats / config ----------------------------
@app.get("/api/config")
def config_endpoint():
    return _safe(
        {
            "llm_provider": CFG.llm.provider,
            "h3_resolution": CFG.geo.h3_resolution,
            "catchment_km": CFG.geo.catchment_km,
            "decay_sigma_km": CFG.geo.decay_sigma_km,
            "quarantine_threshold": CFG.reasoning.quarantine_threshold,
            "cov_temperature": CFG.reasoning.cov_temperature,
            "cov_samples": CFG.reasoning.cov_samples,
        }
    )


@app.get("/api/stats")
def stats_endpoint():
    gold = _Cache.gold_df()
    dossier = _Cache.dossier_df()
    states = gold["address_stateOrRegion"].value_counts().head(10)
    types = gold["facilityTypeId"].value_counts().head(8)

    bands_counter: Counter = Counter()
    if not dossier.empty and "band" in dossier.columns:
        bands_counter.update(dossier["band"].tolist())

    cap_counter: Counter = Counter()
    for tags in gold["raw_capability_tags"].dropna().tolist():
        cap_counter.update(list(tags) if tags is not None else [])

    return _safe(
        {
            "facility_count": int(len(gold)),
            "state_count": int(gold["address_stateOrRegion"].nunique()),
            "city_count": int(gold["address_city"].nunique()),
            "audited_count": int(len(dossier)),
            "trust_bands": dict(bands_counter),
            "top_states": [{"state": k, "count": int(v)} for k, v in states.items()],
            "facility_types": [{"type": k, "count": int(v)} for k, v in types.items()],
            "top_capabilities": [
                {"capability": k, "count": int(v)} for k, v in cap_counter.most_common(20)
            ],
        }
    )


@app.get("/api/capabilities")
def capabilities_endpoint():
    gold = _Cache.gold_df()
    cap_counter: Counter = Counter()
    for tags in gold["raw_capability_tags"].dropna().tolist():
        cap_counter.update(list(tags) if tags is not None else [])

    e2sfca_caps = _Cache.list_capabilities()
    out = []
    for cap, count in cap_counter.most_common():
        desert_pct = None
        if cap in e2sfca_caps:
            df = _Cache.e2sfca_df(cap)
            if not df.empty and "desert" in df.columns:
                desert_pct = float(df["desert"].astype(bool).mean() * 100)
        out.append({"capability": cap, "providers": int(count), "desert_pct": desert_pct, "has_e2sfca": cap in e2sfca_caps})
    return _safe(out)


# ----------------------------- facilities --------------------------------
@app.get("/api/facilities")
def facilities_endpoint(
    state: str | None = None,
    city: str | None = None,
    capability: str | None = None,
    facility_type: str | None = None,
    search: str | None = None,
    limit: int = Query(500, ge=1, le=10000),
    offset: int = 0,
):
    gold = _Cache.gold_df()
    df = gold

    if state:
        df = df[df["address_stateOrRegion"].str.lower() == state.lower()]
    if city:
        df = df[df["address_city"].str.contains(city, case=False, na=False)]
    if facility_type:
        df = df[df["facilityTypeId"] == facility_type]
    if capability:
        df = df[
            df["raw_capability_tags"].apply(
                lambda t: capability in (list(t) if t is not None else [])
            )
        ]
    if search:
        s = search.lower()
        mask = (
            df["name"].str.lower().str.contains(s, na=False)
            | df["address_city"].str.lower().str.contains(s, na=False)
            | df["description"].fillna("").str.lower().str.contains(s, na=False)
        )
        df = df[mask]

    total = len(df)
    df = df.iloc[offset : offset + limit]

    cols = [
        "facility_id",
        "name",
        "address_city",
        "address_stateOrRegion",
        "facilityTypeId",
        "latitude",
        "longitude",
        "h3_index",
        "raw_capability_tags",
        "completeness_score",
        "numberDoctors",
        "capacity",
    ]
    rows = []
    for _, r in df.iterrows():
        item = {c: r.get(c) for c in cols if c in r.index}
        if hasattr(item.get("raw_capability_tags"), "tolist"):
            item["raw_capability_tags"] = item["raw_capability_tags"].tolist()
        rows.append(item)
    return _safe({"total": total, "limit": limit, "offset": offset, "rows": rows})


@app.get("/api/facilities/{facility_id}")
def facility_detail(facility_id: str):
    gold = _Cache.gold_df()
    match = gold[gold["facility_id"] == facility_id]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"facility {facility_id} not found")
    row = match.iloc[0]
    out = {c: row[c] for c in row.index}
    for k, v in list(out.items()):
        if hasattr(v, "tolist"):
            out[k] = v.tolist()
    return _safe(out)


# ----------------------------- dossier -----------------------------------
@app.get("/api/dossier")
def dossier_endpoint(
    band: str | None = None,
    state: str | None = None,
    search: str | None = None,
    limit: int = Query(200, ge=1, le=2000),
):
    dossier = _Cache.dossier_df()
    if dossier.empty:
        return {"total": 0, "rows": []}

    # Use the cached pre-computed columns (no per-request lambda)
    df = dossier
    if band:
        df = df[df["band"] == band]
    if state:
        df = df[df["address_state"] == state]
    if search:
        s = search.lower()
        df = df[df["name"].str.lower().str.contains(s, na=False) | df["address_city"].str.lower().str.contains(s, na=False)]

    total = len(df)
    df = df.head(limit)

    rows = df[
        [
            "facility_id",
            "name",
            "address_city",
            "address_state",
            "latitude",
            "longitude",
            "h3_index",
            "band",
            "score",
            "compliance",
            "contradictions",
            "audited_count",
            "critical_gaps",
            "caps",
        ]
    ].to_dict(orient="records")
    return _safe({"total": total, "rows": rows})


@app.get("/api/dossier/{facility_id}")
def dossier_detail(facility_id: str, on_demand: bool = True):
    """Return the full audit dossier for a facility.

    If the facility hasn't been processed by the batch swarm yet AND
    ``on_demand=true``, run the agents now for that single facility. This
    means every facility in the gold table is "live-auditable" via the UI.
    """
    dossier = _Cache.dossier_df()
    if not dossier.empty:
        match = dossier[dossier["facility_id"] == facility_id]
        if not match.empty:
            row = match.iloc[0].to_dict()
            # Strip the pre-computed scalar columns (UI doesn't need them)
            for k in ("band", "score", "compliance", "contradictions", "audited_count", "critical_gaps", "caps"):
                row.pop(k, None)
            return _safe(row)

    if not on_demand:
        raise HTTPException(status_code=404, detail=f"dossier for {facility_id} not found")

    # On-demand single-facility audit (uses cached Supervisor for speed)
    gold = _Cache.gold_df()
    g = gold[gold["facility_id"] == facility_id]
    if g.empty:
        raise HTTPException(status_code=404, detail=f"facility {facility_id} not found")
    facility = {k: (v.tolist() if hasattr(v, "tolist") else v) for k, v in g.iloc[0].to_dict().items()}

    sup = _get_supervisor()
    result = sup.process_facility(facility)
    return _safe(result)


# Cached supervisor: avoids re-initialising agents + VectorStore per request
_SUPERVISOR = None


def _get_supervisor():
    global _SUPERVISOR
    if _SUPERVISOR is None:
        from aegis_net.agents.supervisor import SupervisorAgent

        _SUPERVISOR = SupervisorAgent(max_workers=1)
        log.info("Initialised cached SupervisorAgent")
    return _SUPERVISOR


# ----------------------------- geo ---------------------------------------
@app.get("/api/geo/desert/{capability}")
def geo_desert(
    capability: str,
    only_deserts: bool = False,
    bbox: str | None = None,
):
    df = _Cache.e2sfca_df(capability)
    if only_deserts:
        df = df[df["desert"].astype(bool)]
    if bbox:
        try:
            min_lon, min_lat, max_lon, max_lat = [float(x) for x in bbox.split(",")]
            df = df[
                (df["lat"].between(min_lat, max_lat)) & (df["lon"].between(min_lon, max_lon))
            ]
        except Exception:
            raise HTTPException(status_code=400, detail="bbox must be 'minLon,minLat,maxLon,maxLat'")

    rows = df[
        ["h3_index", "lat", "lon", "accessibility", "accessibility_norm", "desert", "facility_count", "population_proxy"]
    ].to_dict(orient="records")
    return _safe({
        "capability": capability,
        "count": len(rows),
        "rows": rows,
    })


@app.get("/api/geo/providers/{capability}")
def geo_providers(capability: str):
    gold = _Cache.gold_df()
    f = gold[gold["raw_capability_tags"].apply(lambda t: capability in (list(t) if t is not None else []))]
    rows = f[
        ["facility_id", "name", "address_city", "address_stateOrRegion", "latitude", "longitude", "h3_index", "capacity", "numberDoctors"]
    ].to_dict(orient="records")
    return _safe({"capability": capability, "count": len(rows), "rows": rows})


@app.get("/api/geo/cities")
def geo_cities(q: str = "", limit: int = 20):
    """Autocomplete-friendly city index — aggregates the gold table by
    (city, state) and returns the centroid + facility count for each.
    """
    gold = _Cache.gold_df()
    df = gold[["address_city", "address_stateOrRegion", "latitude", "longitude"]].copy()
    df = df.dropna(subset=["address_city", "latitude", "longitude"])
    grp = (
        df.groupby(["address_city", "address_stateOrRegion"], dropna=False)
        .agg(
            facility_count=("address_city", "count"),
            lat=("latitude", "mean"),
            lon=("longitude", "mean"),
        )
        .reset_index()
        .sort_values("facility_count", ascending=False)
    )
    if q:
        s = q.lower().strip()
        mask = grp["address_city"].str.lower().str.contains(s, na=False) | grp[
            "address_stateOrRegion"
        ].str.lower().str.contains(s, na=False)
        grp = grp[mask]
    grp = grp.head(limit)
    rows = grp.rename(
        columns={"address_city": "city", "address_stateOrRegion": "state"}
    ).to_dict(orient="records")
    return _safe({"count": len(rows), "rows": rows})


@app.get("/api/geo/nearby")
def geo_nearby(
    lat: float,
    lon: float,
    radius_km: float = 50,
    capabilities: str | None = None,
    limit: int = 50,
):
    gold = _Cache.gold_df()
    must = [c.strip() for c in capabilities.split(",")] if capabilities else []
    df = gold.copy()
    if must:
        df = df[
            df["raw_capability_tags"].apply(
                lambda t: all(m in (list(t) if t is not None else []) for m in must)
            )
        ]
    df["distance_km"] = df.apply(
        lambda r: haversine_km(lat, lon, float(r["latitude"]), float(r["longitude"])), axis=1
    )
    df = df[df["distance_km"] <= radius_km].sort_values("distance_km").head(limit)
    rows = df[
        ["facility_id", "name", "address_city", "address_stateOrRegion", "latitude", "longitude", "distance_km", "raw_capability_tags"]
    ].to_dict(orient="records")
    return _safe({"count": len(rows), "rows": rows})


# ----------------------------- traces ------------------------------------
@app.get("/api/traces")
def traces_endpoint(limit: int = 200):
    return _safe({"traces": current_trace(limit)})


# ----------------------------- search ------------------------------------
@app.get("/api/search")
def global_search(q: str, limit: int = 20):
    gold = _Cache.gold_df()
    s = q.lower()
    if not s:
        return {"hits": []}
    mask = (
        gold["name"].str.lower().str.contains(s, na=False)
        | gold["address_city"].str.lower().str.contains(s, na=False)
        | gold["address_stateOrRegion"].str.lower().str.contains(s, na=False)
    )
    hits = gold[mask].head(limit)
    rows = hits[["facility_id", "name", "address_city", "address_stateOrRegion", "latitude", "longitude", "facilityTypeId"]].to_dict(orient="records")
    return _safe({"q": q, "hits": rows})


# ----------------------------- ad-hoc agent run --------------------------
class RunRequest(BaseModel):
    facility_id: str


@app.post("/api/agents/run")
async def run_agents(req: RunRequest):
    """On-demand single-facility audit. Useful for the dashboard's ad-hoc inspector."""
    gold = _Cache.gold_df()
    match = gold[gold["facility_id"] == req.facility_id]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"facility {req.facility_id} not found")
    facility = {k: (v.tolist() if hasattr(v, "tolist") else v) for k, v in match.iloc[0].to_dict().items()}

    sup = _get_supervisor()
    result = await asyncio.to_thread(sup.process_facility, facility)
    return _safe(result)


@app.post("/api/admin/reload")
def reload_caches():
    _Cache.clear()
    return {"status": "ok"}
