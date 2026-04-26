"""Data ingestion: Bronze -> Silver -> Gold (Genie-Code style autonomous pipeline)."""
from .normalize import build_bronze, build_silver, build_gold

__all__ = ["build_bronze", "build_silver", "build_gold"]
