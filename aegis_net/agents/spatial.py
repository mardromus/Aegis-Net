"""Spatial Routing Agent.

Indexes facility coordinates onto H3 Resolution N hexagons and computes
the Enhanced Two-Step Floating Catchment Area (E2SFCA) accessibility
index per population hexagon, per capability.
"""
from __future__ import annotations

from typing import Any

import pandas as pd

from ..geo.e2sfca import compute_e2sfca, demand_grid_from_facilities
from ..geo.h3_index import attach_h3
from .base import Agent


class SpatialAgent(Agent):
    name = "SpatialAgent"
    description = "Computes H3 indices + E2SFCA medical desert accessibility scores."

    def handle(self, payload: dict[str, Any]) -> dict[str, Any]:
        gold: pd.DataFrame = payload["gold"]
        capability: str = payload.get("capability", "icu")
        gold = attach_h3(gold)

        demand = demand_grid_from_facilities(gold)
        access = compute_e2sfca(facilities=gold, demand=demand, capability=capability)

        return {
            "capability": capability,
            "demand_hexagons": int(len(demand)),
            "facilities": int(len(gold)),
            "accessibility": access,
        }
