"""Hybrid Vector Store: Mosaic AI Vector Search in production, FAISS locally.

The interface is identical so agents call ``store.search(query, k)`` and get
back ``[{id, title, text, score, source}]`` regardless of backend.
"""
from __future__ import annotations

import logging
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from ..config import CFG
from .corpus import MEDICAL_CORPUS

log = logging.getLogger(__name__)

_TOKEN_RE = re.compile(r"[a-z0-9]+")


@dataclass
class RetrievedChunk:
    id: str
    title: str
    text: str
    source: str
    score: float

    def to_dict(self) -> dict[str, Any]:
        return {"id": self.id, "title": self.title, "text": self.text, "source": self.source, "score": self.score}


class _BM25Lite:
    """Tiny BM25-style scorer that works with zero external deps and is the
    final-fallback retriever (used when neither sentence-transformers nor
    Mosaic Vector Search are available)."""

    def __init__(self, docs: list[dict[str, str]]):
        self.docs = docs
        self.tokenised = [_TOKEN_RE.findall((d["title"] + " " + d["text"]).lower()) for d in docs]
        self.df: dict[str, int] = {}
        for toks in self.tokenised:
            for t in set(toks):
                self.df[t] = self.df.get(t, 0) + 1
        self.N = len(docs)
        self.avgdl = sum(len(t) for t in self.tokenised) / max(self.N, 1)

    def search(self, query: str, k: int = 4) -> list[RetrievedChunk]:
        q = _TOKEN_RE.findall(query.lower())
        scores: list[tuple[float, int]] = []
        k1, b = 1.5, 0.75
        for i, toks in enumerate(self.tokenised):
            if not toks:
                continue
            score = 0.0
            tf: dict[str, int] = {}
            for t in toks:
                tf[t] = tf.get(t, 0) + 1
            dl = len(toks)
            for term in q:
                if term not in tf:
                    continue
                idf = math.log((self.N - self.df.get(term, 0) + 0.5) / (self.df.get(term, 0) + 0.5) + 1)
                f = tf[term]
                score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl / self.avgdl))
            if score > 0:
                scores.append((score, i))
        scores.sort(reverse=True)
        out: list[RetrievedChunk] = []
        for s, i in scores[:k]:
            d = self.docs[i]
            out.append(RetrievedChunk(d["id"], d["title"], d["text"], d["source"], float(s)))
        return out


class _LocalEmbeddingStore:
    """sentence-transformers + FAISS (or numpy fallback) embedding store."""

    def __init__(self, docs: list[dict[str, str]]):
        from sentence_transformers import SentenceTransformer

        self.docs = docs
        log.info("Loading embedding model %s", CFG.vector.embed_model)
        self.model = SentenceTransformer(CFG.vector.embed_model)
        texts = [d["title"] + ". " + d["text"] for d in docs]
        embs = self.model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        self.embs = np.asarray(embs, dtype="float32")
        try:
            import faiss

            self.index = faiss.IndexFlatIP(self.embs.shape[1])
            self.index.add(self.embs)
            self._faiss = True
        except Exception:
            self._faiss = False

    def search(self, query: str, k: int = 4) -> list[RetrievedChunk]:
        q = self.model.encode([query], normalize_embeddings=True)
        q = np.asarray(q, dtype="float32")
        if self._faiss:
            scores, idx = self.index.search(q, k)
            scores, idx = scores[0], idx[0]
        else:
            sims = (self.embs @ q[0]).tolist()
            order = np.argsort(sims)[::-1][:k]
            idx = order
            scores = np.array([sims[i] for i in order])
        out: list[RetrievedChunk] = []
        for s, i in zip(scores, idx):
            if i < 0:
                continue
            d = self.docs[i]
            out.append(RetrievedChunk(d["id"], d["title"], d["text"], d["source"], float(s)))
        return out


class _DatabricksVectorStore:
    """Mosaic AI Vector Search wrapper (used when DATABRICKS_TOKEN is set)."""

    def __init__(self):
        from databricks.vector_search.client import VectorSearchClient  # type: ignore

        self.client = VectorSearchClient(disable_notice=True)
        self.index = self.client.get_index(
            endpoint_name=CFG.vector.endpoint, index_name=CFG.vector.index
        )

    def search(self, query: str, k: int = 4) -> list[RetrievedChunk]:
        res = self.index.similarity_search(query_text=query, columns=["id", "title", "text", "source"], num_results=k)
        out: list[RetrievedChunk] = []
        for row in res.get("result", {}).get("data_array", []):
            _id, title, text, source, score = row[0], row[1], row[2], row[3], row[-1]
            out.append(RetrievedChunk(str(_id), str(title), str(text), str(source), float(score)))
        return out


class VectorStore:
    """Auto-routing facade over the three backends."""

    def __init__(self, docs: list[dict[str, str]] | None = None):
        self.docs = docs or MEDICAL_CORPUS
        self._backend = self._build_backend()

    def _build_backend(self):
        # 1. Try Databricks Vector Search if creds are present
        if CFG.llm.databricks_token and CFG.llm.databricks_host:
            try:
                log.info("Using Mosaic AI Vector Search backend")
                return _DatabricksVectorStore()
            except Exception as e:  # pragma: no cover
                log.warning("Mosaic Vector Search unavailable, falling back: %s", e)
        # 2. Try local sentence-transformers + FAISS
        try:
            log.info("Using local sentence-transformers vector store")
            return _LocalEmbeddingStore(self.docs)
        except Exception as e:
            log.warning("Embedding store unavailable, falling back to BM25-lite: %s", e)
        # 3. Always-on lexical fallback
        return _BM25Lite(self.docs)

    def search(self, query: str, k: int = 4) -> list[RetrievedChunk]:
        return self._backend.search(query, k)
