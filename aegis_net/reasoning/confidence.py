"""P(True) probabilistic confidence scoring + entropy-based consistency fusion.

Given a candidate claim plus source evidence, query the LLM ``n`` times at
high temperature and ask for a self-verbalised P(True). Then fuse:

    fused = w1 * mean_p_true  +  w2 * (1 - normalised_entropy)

so that highly *confident* AND *consistent* answers receive a high score,
while either over-confidence or unstable sampling pulls the score down.
"""
from __future__ import annotations

import math
from statistics import mean, pstdev
from typing import Iterable

from ..config import CFG
from ..llm.client import LLMClient, get_llm


PTRUE_PROMPT = """You are a clinical evaluation agent.
Analyse the following extracted CLAIM against the SOURCE text.
Provide your explicit probabilistic confidence (0.00 to 1.00) that the
claim is unequivocally supported by the source. Reply ONLY with strict JSON:
{{"p_true": <float>, "rationale": "<one sentence>"}}.

CLAIM: {claim}
SOURCE: {source}
"""


def ptrue_score(claim: str, source: str, *, samples: int | None = None, llm: LLMClient | None = None) -> dict:
    llm = llm or get_llm()
    samples = samples or CFG.reasoning.cov_samples
    temps = [CFG.reasoning.cov_temperature] * samples
    scores: list[float] = []
    for t in temps:
        resp = llm.chat(
            messages=[
                {"role": "system", "content": "You are a clinical evaluation agent that returns calibrated probabilistic confidence scores."},
                {"role": "user", "content": PTRUE_PROMPT.format(claim=claim, source=source[:4000])},
            ],
            temperature=t,
            json_mode=True,
            max_tokens=200,
        )
        try:
            import json

            payload = json.loads(resp.text) if resp.text.strip().startswith("{") else resp.raw
            p = float(payload.get("p_true", 0.5))
        except Exception:
            p = 0.5
        scores.append(max(0.0, min(1.0, p)))
    mu = mean(scores) if scores else 0.5
    sigma = pstdev(scores) if len(scores) > 1 else 0.0
    return {"samples": scores, "mean": round(mu, 4), "std": round(sigma, 4)}


def _entropy(scores: Iterable[float]) -> float:
    """Binary entropy across the [0,1] sample distribution."""
    s = list(scores)
    if not s:
        return 1.0
    bins = [0, 0, 0, 0, 0]
    for x in s:
        idx = min(int(x * 5), 4)
        bins[idx] += 1
    total = sum(bins)
    h = 0.0
    for b in bins:
        if b == 0:
            continue
        p = b / total
        h -= p * math.log2(p)
    return h / math.log2(5)  # normalised 0..1


def fused_confidence(claim: str, source: str, *, llm: LLMClient | None = None) -> dict:
    raw = ptrue_score(claim, source, llm=llm)
    consistency = 1.0 - _entropy(raw["samples"])
    fused = 0.6 * raw["mean"] + 0.4 * consistency
    return {
        "p_true_mean": raw["mean"],
        "p_true_std": raw["std"],
        "consistency": round(consistency, 4),
        "fused": round(fused, 4),
        "samples": raw["samples"],
        "quarantined": fused < CFG.reasoning.quarantine_threshold,
    }
