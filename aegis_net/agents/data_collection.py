"""Data Collection & Integration Agent.

Cleans, parses and structures raw facility records. In Databricks mode this
is the agent that Genie Code drives; locally it works on the bronze frame.
"""
from __future__ import annotations

from typing import Any

import pandas as pd

from ..ingestion.normalize import build_silver
from ..ingestion.parser import explode_lists, normalize_capabilities
from .base import Agent


class DataCollectionAgent(Agent):
    name = "DataCollectionAgent"
    description = "Cleans, parses, and integrates raw facility records into a normalised silver schema."

    def handle(self, payload: dict[str, Any]) -> dict[str, Any]:
        bronze: pd.DataFrame = payload["bronze"]
        silver = build_silver(bronze)
        return {
            "silver": silver,
            "row_count": int(len(silver)),
            "controlled_vocab_examples": (
                silver.head(5)[["facility_id", "name", "raw_capability_tags"]].to_dict(orient="records")
            ),
        }
