# Agents Guide — Aegis-Net

Hi future agent, here's the lay of the land.

## What this project is

Aegis-Net is a Compound AI system that:
1. Ingests 10k Indian medical-facility records (`VF_Hackathon_Dataset_India_Large.xlsx`).
2. Runs a multi-agent swarm (Supervisor + Diagnostic + Auditor + Spatial + Evaluator) to extract evidence-grounded capabilities, score them with `P(True)`, audit them against WHO/NABH guidelines, and assign trust scores.
3. Computes Enhanced Two-Step Floating Catchment Area (E2SFCA) accessibility on H3 hexagons to identify medical deserts.
4. Renders all of this in an interactive Streamlit Command Centre.

## Where to look first

| Question | File |
|---|---|
| How does the Chain of Verification work? | `aegis_net/reasoning/chain_of_verification.py` |
| How is `P(True)` confidence computed? | `aegis_net/reasoning/confidence.py` |
| What are the WHO/NABH dependencies? | `aegis_net/knowledge/taxonomy.py` |
| How is the E2SFCA math implemented? | `aegis_net/geo/e2sfca.py` |
| How does the Supervisor route work? | `aegis_net/agents/supervisor.py` |
| How does the offline LLM stub work? | `aegis_net/llm/client.py::_stub_*` |
| How is the dataset cleaned? | `aegis_net/ingestion/normalize.py` |

## How to run

```bash
python scripts/run_pipeline.py            # full pipeline on 80-row sample
python scripts/run_pipeline.py --full     # all 10k facilities
python -m pytest tests -q                 # 13 tests
streamlit run app/streamlit_app.py        # dashboard
```

## Three execution modes

Set `AEGIS_LLM_PROVIDER` to `databricks`, `openai`, or `offline` (default).

The **offline** provider has a deterministic rule-based stub that handles all four agent prompt families (diagnostic, CoV planning, CoV execution, P(True)). It produces real, evidence-grounded outputs that are good enough to demo the system without any API keys.

## Adding a new capability tag

1. Add the keywords to `CAPABILITY_VOCAB` in `aegis_net/ingestion/parser.py`.
2. Add the dependency entry to `PROCEDURE_DEPENDENCIES` in `aegis_net/knowledge/taxonomy.py`.
3. (Optional) Add a corresponding chunk to `MEDICAL_CORPUS` in `aegis_net/knowledge/corpus.py`.
4. Re-run `python scripts/run_pipeline.py --geo-only` to regenerate the desert map.

## Important invariants

- Never bypass CoV. Capabilities only enter the dossier through `ChainOfVerification.run`.
- Always escape literal JSON braces (`{{` / `}}`) in prompts that go through `str.format(...)`.
- Numpy arrays sometimes show up where you expect Python lists (after `pandas.DataFrame.to_dict("records")`). Use the helper `SupervisorAgent._row_to_dict` or check `hasattr(x, "tolist")` before truthiness tests.
- The dashboard (`app/streamlit_app.py`) handles missing data gracefully — it should never hard-fail if the swarm or geo outputs aren't present yet.
