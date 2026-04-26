"""Centralised configuration for Aegis-Net.

All paths default to local artefacts so the project is fully runnable on a laptop.
Setting the matching environment variables flips the system into Databricks mode
(Foundation Models, Mosaic AI Vector Search, Unity Catalog, MLflow on Databricks).
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # pragma: no cover - dotenv optional
    pass


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
BRONZE_DIR = DATA_DIR / "bronze"
SILVER_DIR = DATA_DIR / "silver"
GOLD_DIR = DATA_DIR / "gold"
ARTIFACTS_DIR = DATA_DIR / "artifacts"

for d in (BRONZE_DIR, SILVER_DIR, GOLD_DIR, ARTIFACTS_DIR):
    d.mkdir(parents=True, exist_ok=True)

RAW_XLSX = PROJECT_ROOT / "VF_Hackathon_Dataset_India_Large.xlsx"


@dataclass
class LLMConfig:
    provider: str = field(default_factory=lambda: os.getenv("AEGIS_LLM_PROVIDER", "offline"))
    databricks_host: str = field(default_factory=lambda: os.getenv("DATABRICKS_HOST", ""))
    databricks_token: str = field(default_factory=lambda: os.getenv("DATABRICKS_TOKEN", ""))
    databricks_endpoint: str = field(
        default_factory=lambda: os.getenv(
            "DATABRICKS_LLM_ENDPOINT", "databricks-meta-llama-3-3-70b-instruct"
        )
    )
    openai_api_key: str = field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    openai_model: str = field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o-mini"))


@dataclass
class VectorConfig:
    endpoint: str = field(
        default_factory=lambda: os.getenv("DATABRICKS_VECTOR_SEARCH_ENDPOINT", "aegis_vector_endpoint")
    )
    index: str = field(
        default_factory=lambda: os.getenv("DATABRICKS_VECTOR_INDEX", "main.aegis.medical_knowledge_index")
    )
    local_index_path: Path = field(default_factory=lambda: ARTIFACTS_DIR / "vector_index.faiss")
    embed_model: str = field(default_factory=lambda: os.getenv("AEGIS_EMBED_MODEL", "all-MiniLM-L6-v2"))


@dataclass
class ReasoningConfig:
    cov_temperature: float = float(os.getenv("AEGIS_COV_TEMPERATURE", "0.7"))
    cov_samples: int = int(os.getenv("AEGIS_COV_SAMPLES", "3"))
    quarantine_threshold: float = float(os.getenv("AEGIS_QUARANTINE_THRESHOLD", "0.88"))


@dataclass
class GeoConfig:
    h3_resolution: int = int(os.getenv("AEGIS_H3_RESOLUTION", "7"))
    catchment_km: float = float(os.getenv("AEGIS_CATCHMENT_KM", "50"))
    decay_sigma_km: float = float(os.getenv("AEGIS_DECAY_SIGMA_KM", "20"))


@dataclass
class MLflowConfig:
    tracking_uri: str = field(default_factory=lambda: os.getenv("MLFLOW_TRACKING_URI", "mlruns"))
    experiment_name: str = field(default_factory=lambda: os.getenv("MLFLOW_EXPERIMENT_NAME", "aegis-net"))


@dataclass
class AegisConfig:
    llm: LLMConfig = field(default_factory=LLMConfig)
    vector: VectorConfig = field(default_factory=VectorConfig)
    reasoning: ReasoningConfig = field(default_factory=ReasoningConfig)
    geo: GeoConfig = field(default_factory=GeoConfig)
    mlflow: MLflowConfig = field(default_factory=MLflowConfig)
    raw_xlsx: Path = RAW_XLSX
    bronze_dir: Path = BRONZE_DIR
    silver_dir: Path = SILVER_DIR
    gold_dir: Path = GOLD_DIR
    artifacts_dir: Path = ARTIFACTS_DIR


CFG = AegisConfig()
