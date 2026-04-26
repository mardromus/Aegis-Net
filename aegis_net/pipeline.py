"""End-to-end Aegis-Net pipeline runner."""
from __future__ import annotations

import json
import logging
from pathlib import Path

import pandas as pd

from .agents.supervisor import SupervisorAgent
from .config import CFG
from .geo.e2sfca import compute_e2sfca, demand_grid_from_facilities
from .geo.h3_index import attach_h3
from .ingestion.normalize import build_bronze, build_gold, build_silver
from .observability.tracing import init_mlflow, trace_span

log = logging.getLogger(__name__)


def _save_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, default=str))


def run_data_pipeline() -> pd.DataFrame:
    bronze = build_bronze()
    silver = build_silver(bronze)
    gold = build_gold(silver)
    return gold


def run_swarm(*, sample: int | None = 50, max_workers: int = 8) -> pd.DataFrame:
    """Run the multi-agent swarm. ``sample`` limits row count for fast demos."""
    init_mlflow()
    gold = pd.read_parquet(CFG.gold_dir / "facilities_gold.parquet")
    sup = SupervisorAgent(max_workers=max_workers)

    with trace_span("Aegis-Net.run_swarm", {"sample": sample, "rows": len(gold)}) as span:
        result = sup({"gold": gold, "sample": sample})
        span["outputs"] = {"facility_count": result["facility_count"]}

    df = result["dossier_df"]
    out_parquet = CFG.gold_dir / "facility_dossier.parquet"
    df.to_parquet(out_parquet, index=False)

    out_json = CFG.gold_dir / "facility_dossier.json"
    _save_json(out_json, result["dossier"])

    log.info("[swarm] wrote dossier rows=%d", len(df))
    return df


def run_geo_engine(capabilities: list[str] | None = None) -> dict[str, dict]:
    """Compute E2SFCA accessibility maps for several capability tags."""
    capabilities = capabilities or ["icu", "trauma", "neurosurgery", "cardiology", "dialysis", "oncology", "maternity", "neonatal"]
    gold = pd.read_parquet(CFG.gold_dir / "facilities_gold.parquet")
    gold = attach_h3(gold)
    demand = demand_grid_from_facilities(gold)

    out: dict[str, dict] = {}
    with trace_span("Aegis-Net.run_geo_engine", {"capabilities": capabilities}):
        for cap in capabilities:
            res = compute_e2sfca(facilities=gold, demand=demand, capability=cap)
            out[cap] = res
            # Persist per-capability access table for the Streamlit map
            access_df = pd.DataFrame(res["accessibility"])
            access_df.to_parquet(CFG.gold_dir / f"e2sfca_{cap}.parquet", index=False)
    _save_json(CFG.gold_dir / "e2sfca_summary.json", {k: v["facility_supply"][:20] if v.get("facility_supply") else [] for k, v in out.items()})
    return out


def run_full_pipeline(*, sample: int | None = 50, capabilities: list[str] | None = None) -> dict:
    init_mlflow()
    gold = run_data_pipeline()
    dossier = run_swarm(sample=sample)
    geo = run_geo_engine(capabilities=capabilities)
    return {"gold_rows": len(gold), "dossier_rows": len(dossier), "geo_capabilities": list(geo.keys())}
