"""H3 hierarchical hexagonal indexing utilities."""
from __future__ import annotations

import logging
from typing import Iterable

import numpy as np
import pandas as pd

from ..config import CFG

log = logging.getLogger(__name__)


def _h3_safe():
    try:
        import h3

        return h3
    except Exception as e:  # pragma: no cover
        log.warning("h3 not available: %s", e)
        return None


def attach_h3(df: pd.DataFrame, *, lat_col: str = "latitude", lon_col: str = "longitude", res: int | None = None) -> pd.DataFrame:
    h3 = _h3_safe()
    res = res or CFG.geo.h3_resolution
    df = df.copy()
    if h3 is None:
        df["h3_index"] = None
        return df
    df["h3_index"] = [
        h3.latlng_to_cell(float(lat), float(lng), res)
        for lat, lng in zip(df[lat_col], df[lon_col])
    ]
    return df


def hex_centroid(cell: str) -> tuple[float, float]:
    h3 = _h3_safe()
    if h3 is None or not cell:
        return (np.nan, np.nan)
    return h3.cell_to_latlng(cell)


def hex_neighbors(cell: str, k: int = 1) -> list[str]:
    h3 = _h3_safe()
    if h3 is None or not cell:
        return []
    try:
        return list(h3.grid_disk(cell, k))
    except Exception:
        return []


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dp = np.radians(lat2 - lat1)
    dl = np.radians(lon2 - lon1)
    a = np.sin(dp / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    c = 2 * np.arcsin(np.sqrt(a))
    return float(R * c)


def haversine_matrix(lat1: Iterable[float], lon1: Iterable[float], lat2: Iterable[float], lon2: Iterable[float]) -> np.ndarray:
    R = 6371.0
    lat1 = np.asarray(list(lat1)); lon1 = np.asarray(list(lon1))
    lat2 = np.asarray(list(lat2)); lon2 = np.asarray(list(lon2))
    p1 = np.radians(lat1)[:, None]
    p2 = np.radians(lat2)[None, :]
    dp = p2 - p1
    dl = (np.radians(lon2)[None, :] - np.radians(lon1)[:, None])
    a = np.sin(dp / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    c = 2 * np.arcsin(np.sqrt(a))
    return R * c
