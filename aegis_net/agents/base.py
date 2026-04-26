"""Lightweight Agno-style Agent base.

We wrap each specialist as a stateless callable plus a system-prompt /
tool-set, mirroring how Databricks Agent Bricks + Agno define worker
agents. Each agent invocation is automatically traced through the
``observability.tracing`` helpers (which forward to MLflow when available).
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable

from ..llm.client import LLMClient, get_llm
from ..observability.tracing import trace_span


@dataclass
class AgentMessage:
    role: str
    content: Any
    sender: str = "supervisor"
    receiver: str = "worker"
    msg_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    ts: float = field(default_factory=time.time)


class Agent:
    name: str = "agent"
    description: str = "Generic Aegis-Net worker"

    def __init__(self, llm: LLMClient | None = None, tools: dict[str, Callable[..., Any]] | None = None):
        self.llm = llm or get_llm()
        self.tools = tools or {}

    def __call__(self, payload: dict[str, Any]) -> dict[str, Any]:
        with trace_span(self.name, payload):
            return self.handle(payload)

    def handle(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError
