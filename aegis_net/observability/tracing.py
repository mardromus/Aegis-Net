"""Lightweight tracing layer that mirrors MLflow 3 GenAI tracing.

If ``mlflow`` is installed and an experiment is configured, every agent
invocation becomes an MLflow span with inputs/outputs/latency. If MLflow
is unavailable, traces still accumulate in:

  1. an in-memory ring buffer (current process)
  2. an append-only JSONL file at ``data/artifacts/traces.jsonl``

The dashboard's /api/traces endpoint reads both, so spans from pipeline
runs (a separate Python process) AND on-demand audits (in the FastAPI
process) all show up in the UI.
"""
from __future__ import annotations

import contextlib
import json
import logging
import os
import time
from collections import deque
from contextvars import ContextVar
from pathlib import Path
from typing import Any, Iterator

from ..config import CFG

log = logging.getLogger(__name__)

_TRACE_BUFFER: deque[dict[str, Any]] = deque(maxlen=2000)
_active_run: ContextVar[Any | None] = ContextVar("active_run", default=None)

_mlflow_initialised = False
_mlflow_available: bool | None = None

_TRACE_FILE: Path = CFG.artifacts_dir / "traces.jsonl"
_TRACE_FILE_MAX_BYTES = 5 * 1024 * 1024  # 5 MB rotation


def init_mlflow() -> None:
    global _mlflow_initialised, _mlflow_available
    if _mlflow_initialised:
        return
    _mlflow_initialised = True
    try:
        import mlflow

        mlflow.set_tracking_uri(CFG.mlflow.tracking_uri)
        mlflow.set_experiment(CFG.mlflow.experiment_name)
        for autolog in ("openai", "langchain"):
            try:
                getattr(mlflow, autolog).autolog()
            except Exception:
                pass
        _mlflow_available = True
        log.info("MLflow tracing initialised: uri=%s exp=%s", CFG.mlflow.tracking_uri, CFG.mlflow.experiment_name)
    except Exception as e:
        _mlflow_available = False
        log.info("MLflow unavailable, using in-memory tracer (%s)", e)


def _safe_repr(obj: Any) -> Any:
    try:
        json.dumps(obj, default=str)
        return obj
    except Exception:
        return str(obj)[:1000]


@contextlib.contextmanager
def trace_span(name: str, inputs: dict[str, Any] | None = None) -> Iterator[dict[str, Any]]:
    init_mlflow()
    span = {"name": name, "start": time.time(), "inputs": _safe_repr(inputs or {}), "outputs": None, "duration_ms": None}
    _TRACE_BUFFER.append(span)
    mlf_span = None
    if _mlflow_available:
        try:
            import mlflow

            mlf_span = mlflow.start_span(name=name, attributes={"aegis.span": True})
            mlf_span.set_inputs(_safe_repr(inputs or {}))
        except Exception:
            mlf_span = None
    try:
        yield span
    finally:
        span["duration_ms"] = round((time.time() - span["start"]) * 1000, 2)
        _persist_span(span)
        if mlf_span is not None:
            try:
                mlf_span.set_outputs(_safe_repr(span.get("outputs") or {}))
                mlf_span.end()
            except Exception:
                pass


def _persist_span(span: dict[str, Any]) -> None:
    """Append the span as a single JSONL line to data/artifacts/traces.jsonl.

    Auto-rotates when the file exceeds 5 MB so it never grows unbounded.
    """
    try:
        _TRACE_FILE.parent.mkdir(parents=True, exist_ok=True)
        if _TRACE_FILE.exists() and _TRACE_FILE.stat().st_size > _TRACE_FILE_MAX_BYTES:
            backup = _TRACE_FILE.with_suffix(".jsonl.old")
            try:
                if backup.exists():
                    backup.unlink()
                os.rename(_TRACE_FILE, backup)
            except Exception:
                pass
        with _TRACE_FILE.open("a", encoding="utf-8") as f:
            f.write(
                json.dumps(
                    {
                        "name": span["name"],
                        "start": span["start"],
                        "duration_ms": span["duration_ms"],
                    },
                    default=str,
                )
                + "\n"
            )
    except Exception:
        pass


def _read_persisted_spans(limit: int) -> list[dict[str, Any]]:
    if not _TRACE_FILE.exists():
        return []
    try:
        with _TRACE_FILE.open("r", encoding="utf-8") as f:
            lines = f.readlines()
        # most recent N
        out: list[dict[str, Any]] = []
        for line in lines[-limit:]:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except Exception:
                continue
        return out
    except Exception:
        return []


def current_trace(limit: int = 200) -> list[dict[str, Any]]:
    """Return recent spans from both in-memory buffer + persisted JSONL.

    De-duplicates and sorts by start time, returning the most recent ``limit``.
    """
    in_mem = list(_TRACE_BUFFER)
    on_disk = _read_persisted_spans(limit * 4)
    by_key: dict[tuple[str, float], dict[str, Any]] = {}
    for s in on_disk + in_mem:
        try:
            key = (s.get("name", ""), float(s.get("start", 0.0)))
        except Exception:
            continue
        by_key[key] = s
    merged = sorted(by_key.values(), key=lambda s: s.get("start", 0.0))
    return merged[-limit:]
