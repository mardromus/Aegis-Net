# Aegis-Net

### Compound AI Intelligence for India's Healthcare Logistics
**Audit 10,000 medical facilities. Map medical deserts. Eradicate the discovery-to-care gap.**

> *"In India, a postal code often determines a lifespan."*
> Aegis-Net turns 10,000 messy facility reports into a self-auditing, evidence-grounded, geospatially-aware reasoning layer for 1.4 billion lives.

---

## 1. Why this exists

70% of India lives outside Tier-1 cities. The crisis isn't just hospital shortage — it's a **discovery and coordination crisis**: families travel for hours only to find a facility lacks the specific oxygen supply, neonatal bed, or specialist they urgently need.

The Virtue Foundation 10k dataset reflects this reality: half the rows have nulls in `equipment`, capability fields are unstructured strings, claims contradict each other, and there is **no ground-truth answer key**. A naive LLM extractor would hallucinate ICUs into existence. We refuse to do that.

Aegis-Net is built around three uncompromising principles:

1. **Zero hallucinations.** Every capability claim must be evidence-anchored to a literal phrase in the source text *and* survive a Chain-of-Verification audit.
2. **Probabilistic honesty.** Every claim ships with a calibrated `P(True)` confidence interval. Anything below the quarantine threshold is routed to human review.
3. **Geospatial truth.** Medical deserts aren't sociological metaphors — they are precise mathematical objects, computed via Enhanced Two-Step Floating Catchment Area (E2SFCA) on H3 hexagonal grids.

---

## 2. The Aegis-Net Architecture

```
                          ┌──────────────────────────┐
                          │   Supervisor Agent (Agno) │
                          └────┬─────────┬───────┬───┘
                               │         │       │
        ┌──────────────────────┘         │       └──────────────────────┐
        ▼                                ▼                              ▼
┌──────────────────┐   ┌────────────────────────────┐   ┌───────────────────────────┐
│ Diagnostic Agent │   │ Resource Auditing Agent     │   │  Spatial Routing Agent    │
│  • CoV 4-phase   │   │  • WHO + NABH dependency   │   │  • H3 Resolution 7        │
│  • CapabilityRAG │   │    graph                    │   │  • E2SFCA Gaussian decay  │
└─────────┬────────┘   │  • Mosaic Vector Search RAG│   │  • OpenRouteService-ready │
          ▼            └────────────┬───────────────┘   └───────────┬───────────────┘
┌──────────────────┐                │                               │
│ Evaluator Agent  │                │                               │
│  • Self-verbalised P(True)        │                               │
│  • Consistency-Level entropy      │                               │
│  • Quarantine routing             │                               │
└─────────┬────────┘                ▼                               ▼
          │              ┌────────────────────┐         ┌────────────────────┐
          ▼              │  Trust Scorer      │         │ Kepler.gl /        │
   ┌─────────────┐       │  • Completeness    │         │ pydeck dashboards  │
   │ MLflow 3    │       │  • Contradictions  │         │                    │
   │ Tracing     │       │  • Citations       │         │ Streamlit Command  │
   └─────────────┘       └────────────────────┘         │ Centre             │
                                                        └────────────────────┘
```

### Layer-by-layer

| Layer | Component | Role |
|-------|-----------|------|
| **Data Engineering** | `ingestion/` (Genie-Code-style SDP) | Ingests `VF_Hackathon_Dataset_India_Large.xlsx`, parses chaotic JSON-array strings, derives controlled-vocabulary capability tags. Bronze → Silver → Gold Delta tables. |
| **Knowledge Grounding** | `knowledge/` + `VectorStore` | WHO Surgical Safety Checklist + NABH ICU/OT + AERB + ICMR Cancer corpus, ingested into Mosaic AI Vector Search (with FAISS / BM25-lite local fallbacks). |
| **Reasoning** | `reasoning/chain_of_verification.py` | 4-phase CoV: Baseline → Plan → Execute → Synthesis. Evidence-grounded, JSON-strict, hallucination-free. |
| **Confidence** | `reasoning/confidence.py` | Self-verbalised `P(True)` × Consistency-Level entropy fusion. Quarantines anything below `0.88`. |
| **Auditing** | `agents/auditing.py` | Cross-references claims against the WHO + NABH dependency graph (`knowledge/taxonomy.py`). Returns `COMPLIANT / FLAGGED / CRITICAL_GAP`. |
| **Trust Scoring** | `trust/trust_scorer.py` | Fuses completeness + confidence + contradiction signals into an `0..1` trust score with row-level evidence citations. |
| **Geo Engine** | `geo/h3_index.py` + `geo/e2sfca.py` | H3 Resolution 7 indexing + full Stage-1/Stage-2 E2SFCA with Gaussian distance decay. |
| **Orchestration** | `agents/supervisor.py` | Agno-style Supervisor-Worker topology with thread-pool execution and full MLflow span tracing. |
| **Observability** | `observability/tracing.py` | Auto-attaches MLflow 3 traces to every agent invocation; falls back to an in-memory ring buffer for the Streamlit Trace tab when MLflow isn't configured. |
| **UX** | `app/streamlit_app.py` | Interactive Command Centre: Medical Desert Map, Facility Dossiers, Reasoning Console, Chain-of-Thought Trace, Data Browser. |

---

## 3. The "no-hallucination" guarantee — Chain of Verification

For every facility, the **Diagnostic Agent** runs the four-phase CoV protocol:

1. **Baseline draft** — extract candidate capabilities from the evidence text only.
2. **Verification planning** — auto-generate atomic questions ("*Does the source text explicitly mention robotic surgery?*").
3. **Independent execution** — answer each question, citing an exact evidentiary span.
4. **Synthesis & pruning** — drop every claim that didn't survive verification.

Then the **Evaluator Agent** runs `P(True)` self-verbalised confidence × entropy-of-samples and **fuses** them into a single `fused_confidence` ∈ `[0, 1]`. Anything below `0.88` is **quarantined** and routed to a human steward via the MLflow Review App.

The Auditor then layers the WHO + NABH dependency graph on top: even a high-confidence claim of "ICU" is flagged `CRITICAL_GAP` if the source text doesn't literally reference a ventilator, monitor or defibrillator.

> **Real example from the live run:** A pathology lab in Coimbatore claimed `cardiology, icu, maternity, urology`. Aegis-Net auto-detected **5 contradictions**, downgraded the trust score to **`0.19`**, and quarantined the record — exactly the behaviour the brief calls for under "the Trust Scorer".

---

## 4. Eradicating Medical Deserts — H3 + E2SFCA

For every capability tag, Aegis-Net computes:

**Stage 1** (per provider _j_):
$$R_j = \frac{S_j}{\sum_{k\in\{d_{kj}\le d_0\}} P_k\,f(d_{kj})}$$

**Stage 2** (per population hexagon _i_):
$$A_i = \sum_{j\in\{d_{ij}\le d_0\}} R_j\,f(d_{ij})$$

with Gaussian decay $f(d)=\exp(-d^2/2\sigma^2)$. Hexagons in the bottom 25th-percentile of normalised accessibility get marked as **medical deserts** for that capability.

Live results from the included dataset (~10k facilities, H3 res 7):

| Capability | Providers | % India in desert |
|---|---:|---:|
| Dialysis | 47 | **69.6 %** |
| Neurosurgery | 287 | 39.8 % |
| Neonatal (NICU) | 220 | 37.7 % |
| Trauma | 1,029 | 32.3 % |
| Oncology | 612 | 28.3 % |
| ICU | 1,684 | 25.0 % |
| Cardiology | 1,438 | 25.0 % |

Dialysis is the worst-served — a single misallocation can mean a 4-hour drive between sessions. The map *immediately* shows planners exactly which PIN codes need a new RO water plant.

---

## 5. Quick start

### 5a. Local — full-stack (FastAPI + Next.js Command Centre)

```powershell
# 1. Install Python deps + run the pipeline once
python -m pip install -r requirements.txt
python scripts/run_pipeline.py --sample 200

# 2. Install frontend deps
cd frontend; npm install --legacy-peer-deps; cd ..

# 3. Boot the whole stack (frees ports, runs pipeline if needed,
#    starts FastAPI on :8000, Next.js on :3000, opens browser)
.\launch.ps1
```

The Aegis-Net **Command Centre** (Linear/Vercel-grade UI) has:

- **Landing** (`/`) — cinematic hero, live KPIs streaming from FastAPI, capability inequity bars, architecture explainer, capability leaderboard.
- **Dashboard** (`/dashboard`) — KPI strip, top-capabilities bar chart, trust band radial chart, contradictions feed, top-states distribution.
- **Medical Desert Map** (`/map`) — **deck.gl H3HexagonLayer** + **MapLibre dark base** rendering all 4,724 demand hexagons in 3D with Gaussian-decay accessibility colouring. Toggle providers, filter to deserts only, switch capabilities live.
- **Facility Dossiers** (`/dossier`) — searchable, sortable, band-filtered list. Click any row → CoV trace timeline, P(True) confidence chart, citation panel, contradiction feed, full WHO/NABH audit.
- **Agent Traces** (`/traces`) — Supervisor → Workers topology + per-agent latency histogram + recent spans (auto-refresh every 5s).
- **Reasoning Console** (`/reason`) — multi-attribute "must-have" search with great-circle radius around any anchor city.
- **Cmd+K palette** — fuzzy facility search + navigation, anywhere.

### 5b. Local — Streamlit fallback (no Node required)

```bash
streamlit run app/streamlit_app.py         # open http://localhost:8501
```

The system runs in three modes:

| `AEGIS_LLM_PROVIDER` | What happens |
|---|---|
| `databricks` | Uses Databricks Foundation Models (Llama-3-70B / Claude / GPT) via the OpenAI-compatible serving endpoint, plus Mosaic AI Vector Search. |
| `openai` | Uses OpenAI / Azure OpenAI as the agent LLM. |
| `offline` *(default)* | **Fully runnable on a laptop with zero API keys.** A deterministic rule-based stub answers every CoV / P(True) prompt by lexically grounding against the source text. The CoV pipeline, the audit, the geo engine, the trust scorer and the dashboard all execute on real data — only the LLM-narrative parts are templated. |

### 5b. Databricks Free Edition

```bash
databricks bundle validate
databricks bundle deploy -t dev
databricks bundle run aegis_full_pipeline -t dev
```

The bundle (`databricks.yml`) deploys five notebooks:

1. `01_ingest_and_normalize` — Genie Code-style SDP, writes Bronze/Silver/Gold to Unity Catalog.
2. `02_vector_search_setup` — embeds the WHO/NABH corpus into Mosaic AI Vector Search.
3. `03_agent_swarm_audit` — runs the swarm with `mlflow.openai.autolog()` on Foundation Models and writes the dossier table.
4. `04_geospatial_e2sfca` — H3 indexing + E2SFCA per capability, persisted as `e2sfca_<capability>` Delta tables.
5. `05_kepler_visualization` — `%mosaic_kepler` rendering of the desert maps.

Plus a Databricks App (`app/streamlit_app.py`) registered as `aegis-command-centre`.

---

## 6. Project layout

```
Hack-Nation/
├── README.md                       this file
├── launch.ps1                      one-shot full-stack launcher
├── requirements.txt
├── databricks.yml                  Asset Bundle: jobs, app, schedules
├── .env.example
├── notebooks/                      Databricks notebooks (5 phases)
├── frontend/                       ↘  Next.js 15 + TypeScript + Tailwind
│   ├── app/
│   │   ├── page.tsx                  landing (cinematic hero)
│   │   ├── dashboard/page.tsx        live KPIs + charts
│   │   ├── map/page.tsx              deck.gl + maplibre H3 desert atlas
│   │   ├── dossier/                  list + [id] detail (CoV trace, audits)
│   │   ├── traces/page.tsx           agent topology + latency
│   │   └── reason/page.tsx           multi-attribute reasoning console
│   ├── components/
│   │   ├── landing/                  Hero, LiveStats, Architecture, ...
│   │   ├── shell/                    TopNav, CommandPalette (Cmd+K), Footer
│   │   ├── map/HexMap.tsx            deck.gl H3HexagonLayer
│   │   └── dossier/                  CovTimeline, ConfidenceChart
│   ├── lib/{api.ts,utils.ts}
│   └── tailwind.config.ts            full custom design system
├── backend/                        ↘  FastAPI exposing all pipeline outputs
│   └── main.py                       /api/stats, /api/dossier, /api/geo/*, /api/search, /api/traces, /api/agents/run
├── app/
│   └── streamlit_app.py            Streamlit fallback dashboard
├── aegis_net/
│   ├── config.py
│   ├── ingestion/                  bronze → silver → gold
│   ├── knowledge/                  WHO/NABH corpus + taxonomy + VectorStore
│   ├── reasoning/                  Chain-of-Verification + P(True) fusion
│   ├── llm/                        multi-provider client w/ offline stub
│   ├── agents/                     supervisor + 4 specialised workers
│   ├── trust/                      contradiction & citation engine
│   ├── geo/                        H3 indexing + E2SFCA mathematics
│   ├── observability/              MLflow 3 tracing
│   └── pipeline.py                 orchestrator
├── scripts/
│   ├── run_pipeline.py             one-command runner
│   ├── inspect_dataset.py
│   ├── debug_cov.py
│   └── peek_dossier.py
├── tests/                          pytest suite (CoV, geo, trust, ingestion)
└── data/                           bronze/silver/gold parquet outputs
```

---



### Stretch goals — all delivered

* **Agentic Traceability**: every capability has a citation span; every agent invocation is an MLflow span; the Streamlit Trace tab visualises latencies + the full CoV reasoning trace JSON.
* **Self-correction loops**: Evaluator Agent quarantines low-confidence claims; Auditor Agent overrides high-confidence claims that fail the WHO/NABH dependency graph; Trust Scorer applies rule-based contradiction detection on top.
* **Dynamic Crisis Mapping**: Streamlit Map tab shows H3 hexagons colour-graded by E2SFCA accessibility per capability, with an "only deserts" filter for instant crisis-zone identification.

---

## 7. Tech stack

* **Databricks Data Intelligence Platform** (Free Edition compatible)
* **Databricks Agent Bricks + Genie Code** (autonomous data engineering)
* **Agno** (multi-agent framework — implemented in `aegis_net/agents/`)
* **Mosaic AI Vector Search** (governed RAG; FAISS local fallback)
* **MLflow 3** (tracing, evaluation, LLM-as-a-Judge)
* **H3** geospatial indexing (Uber)
* **E2SFCA** (Enhanced Two-Step Floating Catchment Area)
* **Streamlit + pydeck + plotly** (Command Centre)
* **Foundation Models**: dynamic routing across Llama-3-70B / Claude Sonnet / GPT-class endpoints via Agent Bricks multi-AI orchestration

---

## 8. Reproducing the demo numbers

```bash
python scripts/run_pipeline.py --data-only         # ~9 s
python scripts/run_pipeline.py --swarm-only --sample 200   # ~1 s offline / ~30 s on Databricks Llama-3-70B
python scripts/run_pipeline.py --geo-only           # ~14 s for 8 capabilities
python -m pytest tests -q                            # 13 passed
streamlit run app/streamlit_app.py
```

---



> Aegis-Net turns a static list of 10,000 buildings into a **living intelligence network** that knows where the help is — and where it needs to go.
