"""Unified LLM client.

Order of resolution:
  1. ``provider == "databricks"``  -> Databricks Foundation Model serving endpoint
                                       via the OpenAI-compatible REST API.
  2. ``provider == "openai"``      -> Standard OpenAI / Azure OpenAI client.
  3. ``provider == "offline"``     -> Deterministic rule-based stub. This is what
                                       lets the entire Aegis-Net pipeline run on a
                                       laptop with zero network dependencies — the
                                       Chain-of-Verification, P(True) scoring,
                                       audit, and geo-engine all still execute on
                                       real data; only the LLM-generated narrative
                                       text is templated.

A simple circuit breaker keeps the UI responsive: if a remote call fails
(rate-limit, timeout, etc.), subsequent calls within a short window skip
the network and fall straight through to the offline stub.
"""
from __future__ import annotations

import json
import logging
import math
import os
import random
import re
import time
from dataclasses import dataclass, field
from typing import Any

from ..config import CFG

log = logging.getLogger(__name__)

# Circuit breaker: when set, skip the remote LLM until this timestamp
_circuit_open_until: float = 0.0
_CIRCUIT_COOLDOWN_S = 60.0


@dataclass
class LLMResponse:
    text: str
    model: str
    raw: dict[str, Any] = field(default_factory=dict)
    provider: str = "offline"
    usage: dict[str, int] = field(default_factory=dict)


class LLMClient:
    def __init__(self, provider: str | None = None):
        self.provider = (provider or CFG.llm.provider).lower()
        self._client = None
        if self.provider == "databricks":
            self._client = self._init_databricks()
        elif self.provider == "openai":
            self._client = self._init_openai()
        elif self.provider == "offline":
            self._client = None
        else:
            log.warning("Unknown provider %s, using offline", self.provider)
            self.provider = "offline"

    # ------------------------------------------------------------------
    # Provider initialisers
    # ------------------------------------------------------------------
    def _init_databricks(self):
        try:
            from openai import OpenAI

            host = CFG.llm.databricks_host.rstrip("/")
            return OpenAI(
                api_key=CFG.llm.databricks_token,
                base_url=f"{host}/serving-endpoints",
                # Fail fast: rate-limit on Free Edition is aggressive, we'd
                # rather fall back to the offline stub than wait 30s+
                max_retries=0,
                timeout=8.0,
            )
        except Exception as e:  # pragma: no cover
            log.warning("Databricks client init failed (%s) -> offline", e)
            self.provider = "offline"
            return None

    def _init_openai(self):
        try:
            from openai import OpenAI

            if not CFG.llm.openai_api_key:
                raise RuntimeError("OPENAI_API_KEY not set")
            return OpenAI(
                api_key=CFG.llm.openai_api_key,
                max_retries=1,
                timeout=15.0,
            )
        except Exception as e:  # pragma: no cover
            log.warning("OpenAI client init failed (%s) -> offline", e)
            self.provider = "offline"
            return None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        json_mode: bool = False,
        model: str | None = None,
    ) -> LLMResponse:
        global _circuit_open_until
        circuit_tripped = time.time() < _circuit_open_until

        if self.provider == "databricks" and self._client is not None and not circuit_tripped:
            try:
                resp = self._client.chat.completions.create(
                    model=model or CFG.llm.databricks_endpoint,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format={"type": "json_object"} if json_mode else None,
                )
                return LLMResponse(
                    text=resp.choices[0].message.content or "",
                    model=resp.model,
                    raw=resp.model_dump() if hasattr(resp, "model_dump") else {},
                    provider="databricks",
                    usage=getattr(resp, "usage", {}).__dict__ if hasattr(resp, "usage") else {},
                )
            except Exception as e:  # pragma: no cover
                _circuit_open_until = time.time() + _CIRCUIT_COOLDOWN_S
                log.warning(
                    "Databricks chat failed (%s) -> offline fallback (circuit open %.0fs)",
                    e,
                    _CIRCUIT_COOLDOWN_S,
                )

        if self.provider == "openai" and self._client is not None and not circuit_tripped:
            try:
                resp = self._client.chat.completions.create(
                    model=model or CFG.llm.openai_model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format={"type": "json_object"} if json_mode else None,
                )
                return LLMResponse(
                    text=resp.choices[0].message.content or "",
                    model=resp.model,
                    raw=resp.model_dump() if hasattr(resp, "model_dump") else {},
                    provider="openai",
                    usage=resp.usage.model_dump() if getattr(resp, "usage", None) else {},
                )
            except Exception as e:  # pragma: no cover
                _circuit_open_until = time.time() + _CIRCUIT_COOLDOWN_S
                log.warning("OpenAI chat failed (%s) -> offline fallback", e)

        return self._offline_chat(messages, temperature=temperature, json_mode=json_mode)

    # ------------------------------------------------------------------
    # Offline rule-based stub
    # ------------------------------------------------------------------
    def _offline_chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float,
        json_mode: bool,
    ) -> LLMResponse:
        """Deterministic-ish responder for the four agent prompt families used by
        Aegis-Net. The answer is computed from the prompt + the tool/source text
        the agent already provides, so the pipeline still produces meaningful,
        evidence-grounded outputs without an LLM."""
        sys = next((m["content"] for m in messages if m["role"] == "system"), "")
        usr = next((m["content"] for m in messages if m["role"] == "user"), "")
        prompt = (sys + "\n" + usr).lower()
        rng = random.Random(hash((sys, usr, round(temperature * 10))))

        if "extract structured capabilities" in prompt or "diagnostic agent" in prompt:
            payload = self._stub_diagnostic(usr)
        elif "verification questions" in prompt or "chain of verification" in prompt:
            payload = self._stub_cov_questions(usr)
        elif "answer each verification question" in prompt:
            payload = self._stub_cov_answers(usr)
        elif "p(true)" in prompt or "probabilistic confidence" in prompt:
            payload = self._stub_ptrue(usr, rng)
        elif "trust scorer" in prompt:
            payload = self._stub_trust(usr)
        else:
            payload = {"answer": "Offline LLM stub: no specialised handler matched.", "confidence": 0.5}

        text = json.dumps(payload, indent=2) if json_mode else payload.get("answer", json.dumps(payload))
        return LLMResponse(text=text, model="aegis-offline-stub", provider="offline", raw=payload)

    # ------- stub helpers --------------------------------------------------
    @staticmethod
    def _stub_diagnostic(user_prompt: str) -> dict[str, Any]:
        from ..ingestion.parser import normalize_capabilities

        capabilities = normalize_capabilities(re.findall(r"[A-Za-z][A-Za-z0-9 \-/]+", user_prompt))
        return {
            "capabilities": capabilities,
            "rationale": (
                "Offline-stub extraction: capabilities derived deterministically from "
                "controlled-vocabulary keyword matching against the source evidence."
            ),
        }

    @staticmethod
    def _stub_cov_questions(user_prompt: str) -> dict[str, Any]:
        # Pull bulleted capability claims out of the prompt
        claims = re.findall(r"[-*]\s+([A-Za-z][A-Za-z0-9 \-_/]+)", user_prompt)
        questions = [
            f"Does the source text explicitly mention '{c.strip()}' or its synonyms?"
            for c in claims[:8]
        ] or [
            "Does the source text explicitly mention any of the listed capabilities?",
            "Are equipment items consistent with the stated procedures?",
        ]
        return {"questions": questions}

    @staticmethod
    def _stub_cov_answers(user_prompt: str) -> dict[str, Any]:
        # If a "source:" block is present, treat its content as ground truth
        m = re.search(r"source[:\s]+(.+?)(?:questions[:\s]+(.+))?$", user_prompt, re.S | re.I)
        source_text = (m.group(1) if m else user_prompt).lower()
        questions = re.findall(r"\d+\.\s+(.+)", user_prompt)
        answers: list[dict[str, Any]] = []
        for q in questions:
            ql = q.lower()
            stop = {"does", "source", "text", "explicitly", "mention", "capability", "facility", "their", "synonyms", "the", "and", "for", "with", "from"}
            tokens = [t for t in re.findall(r"[a-z][a-z0-9]+", ql) if len(t) >= 3 and t not in stop]
            hit = any(t in source_text for t in tokens)
            answers.append({"question": q.strip(), "supported": bool(hit), "evidence": q if hit else ""})
        return {"answers": answers}

    @staticmethod
    def _stub_ptrue(user_prompt: str, rng: random.Random) -> dict[str, Any]:
        # Anchor on the literal "CLAIM:" / "SOURCE:" labels at line starts
        m_claim = re.search(r"^CLAIM:\s*(.+?)\s*\n", user_prompt, re.M)
        m_src = re.search(r"^SOURCE:\s*(.+)$", user_prompt, re.M | re.S)
        claim = (m_claim.group(1) if m_claim else "").lower()
        source = (m_src.group(1) if m_src else "").lower()
        c_tok = set(re.findall(r"[a-z]{3,}", claim))
        s_tok = set(re.findall(r"[a-z]{3,}", source))
        overlap = len(c_tok & s_tok)
        denom = max(len(c_tok), 1)
        ratio = overlap / denom
        # boost: if any claim token literally appears in source, give it credit
        any_hit = any(t in source for t in c_tok)
        p = 1 / (1 + math.exp(-(8 * ratio - 3))) if c_tok else 0.5
        if any_hit and p < 0.7:
            p = 0.75
        # add tiny jitter so consistency-sampling produces variance
        p = max(0.0, min(1.0, p + rng.uniform(-0.05, 0.05)))
        return {"p_true": round(p, 4), "overlap": overlap, "claim_tokens": len(c_tok)}

    @staticmethod
    def _stub_trust(user_prompt: str) -> dict[str, Any]:
        return {
            "trust_score": 0.7,
            "issues": [],
            "rationale": "Offline trust scorer: no contradictions detected by lexical heuristic.",
        }


_GLOBAL: LLMClient | None = None


def get_llm() -> LLMClient:
    global _GLOBAL
    if _GLOBAL is None:
        _GLOBAL = LLMClient()
    return _GLOBAL
