"""Aegis-Net Command Centre.

Streamlit dashboard rendering:
    - Live geospatial map of Indian medical capabilities (H3 hexagons)
    - E2SFCA Medical Desert overlay per capability (Dialysis, Trauma, ...)
    - Per-facility dossier with full Chain-of-Verification trace + citations
    - Trust band distribution + contradictions feed
    - Natural-language Multi-Attribute Reasoning Console

Launch:
    streamlit run app/streamlit_app.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from aegis_net.config import CFG  # noqa: E402
from aegis_net.geo.h3_index import attach_h3, hex_centroid, haversine_km  # noqa: E402
from aegis_net.ingestion.parser import normalize_capabilities  # noqa: E402

st.set_page_config(page_title="Aegis-Net • Healthcare Intelligence Command Centre", layout="wide", initial_sidebar_state="expanded")

# ----------------------------- styling ----------------------------------
st.markdown(
    """
    <style>
        .stApp { background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%); }
        h1, h2, h3, h4 { color: #e8eaf6; }
        .metric-card {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(123, 104, 238, 0.3);
            padding: 1rem; border-radius: 12px; backdrop-filter: blur(8px);
        }
        .trust-pill {
            display: inline-block; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 12px;
        }
        .trust-HIGH_TRUST  { background:#10b981; color:white; }
        .trust-MEDIUM_TRUST{ background:#3b82f6; color:white; }
        .trust-LOW_TRUST   { background:#f59e0b; color:white; }
        .trust-QUARANTINED { background:#ef4444; color:white; }
        .stTabs [data-baseweb="tab-list"] { gap: 8px; }
        .stTabs [data-baseweb="tab"] {
            background: rgba(123,104,238,0.1); border-radius: 8px; padding: 8px 14px;
        }
        .stTabs [aria-selected="true"] { background: rgba(123,104,238,0.4); }
    </style>
    """,
    unsafe_allow_html=True,
)


# ----------------------------- data loaders ------------------------------
@st.cache_data(show_spinner="Loading 10k facilities…")
def load_gold() -> pd.DataFrame:
    p = CFG.gold_dir / "facilities_gold.parquet"
    if not p.exists():
        st.error("Gold table not found. Run `python scripts/run_pipeline.py --data-only` first.")
        return pd.DataFrame()
    return pd.read_parquet(p)


@st.cache_data(show_spinner="Loading agent dossier…")
def load_dossier() -> pd.DataFrame:
    p = CFG.gold_dir / "facility_dossier.parquet"
    if not p.exists():
        return pd.DataFrame()
    return pd.read_parquet(p)


@st.cache_data
def load_e2sfca(capability: str) -> pd.DataFrame:
    p = CFG.gold_dir / f"e2sfca_{capability}.parquet"
    if not p.exists():
        return pd.DataFrame()
    return pd.read_parquet(p)


def list_e2sfca_capabilities() -> list[str]:
    return sorted([p.stem.replace("e2sfca_", "") for p in CFG.gold_dir.glob("e2sfca_*.parquet")])


# ----------------------------- header ------------------------------------
col_a, col_b = st.columns([0.7, 0.3])
with col_a:
    st.markdown(
        """
        # Aegis-Net
        ### Compound AI Intelligence for India's Healthcare Logistics
        *Audit 10,000 facilities. Map medical deserts. Eradicate the discovery-to-care gap.*
        """
    )
with col_b:
    st.markdown(
        f"""
        <div class='metric-card'>
            <b>Provider:</b> {CFG.llm.provider} <br/>
            <b>H3 res:</b> {CFG.geo.h3_resolution} <br/>
            <b>Catchment:</b> {CFG.geo.catchment_km} km <br/>
            <b>P(True) gate:</b> {CFG.reasoning.quarantine_threshold}
        </div>
        """,
        unsafe_allow_html=True,
    )

gold = load_gold()
dossier = load_dossier()

if gold.empty:
    st.stop()

# ----------------------------- KPI strip ---------------------------------
k1, k2, k3, k4, k5 = st.columns(5)
k1.metric("Facilities indexed", f"{len(gold):,}")
k2.metric("States / UTs covered", gold["address_stateOrRegion"].nunique())
k3.metric("Cities", gold["address_city"].nunique())
if not dossier.empty:
    bands = dossier.apply(lambda r: r["trust"]["band"], axis=1)
    k4.metric("Audited (sample)", len(dossier))
    k5.metric("Quarantined %", f"{(bands == 'QUARANTINED').mean() * 100:.1f}%")
else:
    k4.metric("Audited (sample)", 0)
    k5.metric("Quarantined %", "—")
    st.info("No agent dossier yet — run `python scripts/run_pipeline.py --swarm-only --sample 200` to populate.")

# ----------------------------- tabs --------------------------------------
TAB_MAP, TAB_AUDIT, TAB_QUERY, TAB_TRACE, TAB_DATA = st.tabs(
    [
        "Medical Desert Map",
        "Facility Dossiers",
        "Reasoning Console",
        "Chain-of-Thought Trace",
        "Data Browser",
    ]
)


# ----------------------------- MAP ---------------------------------------
with TAB_MAP:
    available_caps = list_e2sfca_capabilities()
    if not available_caps:
        st.warning("Run the geospatial engine first: `python scripts/run_pipeline.py --geo-only`")
    else:
        c1, c2, c3 = st.columns([1, 1, 2])
        capability = c1.selectbox("Capability", available_caps, index=available_caps.index("trauma") if "trauma" in available_caps else 0)
        only_deserts = c2.checkbox("Show only deserts", value=False)
        layer = c3.radio("Layer", ["Accessibility heatmap", "Facility scatter"], horizontal=True)

        access = load_e2sfca(capability)
        providers = gold[gold["raw_capability_tags"].apply(lambda t: capability in (list(t) if t is not None else []))]

        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Capability", capability.replace("_", " ").title())
        m2.metric("Providers detected", f"{len(providers):,}")
        m3.metric("Demand hexagons", f"{len(access):,}")
        if not access.empty:
            m4.metric("% in desert", f"{access['desert'].mean() * 100:.1f}%")

        if not access.empty:
            try:
                import pydeck as pdk

                if only_deserts:
                    access = access[access["desert"]]

                # Color: green = great access, red = desert
                def _color(score: float) -> list[int]:
                    s = float(np.clip(score, 0, 1))
                    return [int(255 * (1 - s)), int(180 * s), 60, 200]

                access = access.copy()
                access["fill"] = access["accessibility_norm"].apply(_color)

                hex_layer = pdk.Layer(
                    "H3HexagonLayer",
                    data=access,
                    pickable=True,
                    stroked=True,
                    filled=True,
                    extruded=True,
                    elevation_scale=3000,
                    get_hexagon="h3_index",
                    get_elevation="accessibility_norm",
                    get_fill_color="fill",
                    line_width_min_pixels=1,
                )

                fac_layer = pdk.Layer(
                    "ScatterplotLayer",
                    data=providers[["name", "latitude", "longitude", "address_city"]],
                    get_position=["longitude", "latitude"],
                    get_fill_color=[123, 104, 238, 200],
                    get_radius=3000,
                    pickable=True,
                )

                view_state = pdk.ViewState(latitude=22.0, longitude=80.0, zoom=4.3, pitch=35)
                layers = [hex_layer] if layer == "Accessibility heatmap" else [hex_layer, fac_layer]
                if layer == "Facility scatter":
                    layers = [fac_layer, hex_layer]

                deck = pdk.Deck(
                    layers=layers,
                    initial_view_state=view_state,
                    map_style=None,
                    tooltip={
                        "html": "<b>{h3_index}</b><br/>access={accessibility_norm}<br/>desert={desert}",
                        "style": {"backgroundColor": "#1a1f3a", "color": "white"},
                    },
                )
                st.pydeck_chart(deck, use_container_width=True)
            except Exception as e:
                st.warning(f"pydeck render failed ({e}). Falling back to scatter chart.")
                st.map(access.rename(columns={"lat": "latitude", "lon": "longitude"})[["latitude", "longitude"]])

            st.markdown("##### Access distribution")
            try:
                import plotly.express as px

                fig = px.histogram(
                    access,
                    x="accessibility_norm",
                    nbins=40,
                    color="desert",
                    color_discrete_map={True: "#ef4444", False: "#10b981"},
                    title=f"Normalised E2SFCA accessibility — {capability}",
                )
                fig.update_layout(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)", font_color="#e8eaf6")
                st.plotly_chart(fig, use_container_width=True)
            except Exception:
                st.bar_chart(access["accessibility_norm"])


# ----------------------------- DOSSIER -----------------------------------
with TAB_AUDIT:
    if dossier.empty:
        st.info("Run the swarm to populate dossiers: `python scripts/run_pipeline.py --swarm-only --sample 200`")
    else:
        d = dossier.copy()
        d["score"] = d.apply(lambda r: r["trust"]["trust_score"], axis=1)
        d["band"] = d.apply(lambda r: r["trust"]["band"], axis=1)
        d["caps"] = d.apply(lambda r: ", ".join(list(r["diagnostic"]["capabilities"])[:6]), axis=1)
        d["compliance"] = d.apply(lambda r: r["audit"]["summary"]["compliance_index"], axis=1)
        d["contradictions"] = d.apply(lambda r: len(r["trust"]["contradictions"]), axis=1)

        c1, c2, c3 = st.columns([1, 1, 2])
        band_filter = c1.multiselect("Trust band", sorted(d["band"].unique().tolist()), default=sorted(d["band"].unique().tolist()))
        state_filter = c2.multiselect("State", sorted(d["address_state"].dropna().unique().tolist()))
        search = c3.text_input("Search facility name / city")

        view = d[d["band"].isin(band_filter)]
        if state_filter:
            view = view[view["address_state"].isin(state_filter)]
        if search:
            mask = view["name"].str.contains(search, case=False, na=False) | view["address_city"].str.contains(search, case=False, na=False)
            view = view[mask]

        st.dataframe(
            view[["facility_id", "name", "address_city", "address_state", "band", "score", "compliance", "contradictions", "caps"]],
            use_container_width=True,
            hide_index=True,
        )

        st.markdown("---")
        chosen = st.selectbox("Inspect facility", view["facility_id"].tolist() if not view.empty else [])
        if chosen:
            row = view[view["facility_id"] == chosen].iloc[0].to_dict()
            full = dossier[dossier["facility_id"] == chosen].iloc[0].to_dict()

            head_l, head_r = st.columns([0.7, 0.3])
            with head_l:
                st.subheader(full["name"])
                st.caption(f"{full.get('address_city','?')}, {full.get('address_state','?')}  •  {full.get('h3_index','')}  •  ({full.get('latitude'):.3f}, {full.get('longitude'):.3f})")
            with head_r:
                band = full["trust"]["band"]
                st.markdown(f"<div class='trust-pill trust-{band}'>{band}</div>", unsafe_allow_html=True)
                st.metric("Trust score", f"{full['trust']['trust_score']:.2f}")
                st.metric("Compliance index", f"{full['audit']['summary']['compliance_index']:.2f}")

            cap_col, ev_col = st.columns(2)
            with cap_col:
                st.markdown("##### CoV-verified capabilities")
                for cap in list(full["diagnostic"]["capabilities"])[:30]:
                    st.markdown(f"- `{cap}`")
                if list(full["diagnostic"].get("cov", {}).get("pruned", [])):
                    with st.expander("Pruned (failed verification)"):
                        for p in full["diagnostic"]["cov"]["pruned"]:
                            st.markdown(f"- ~~{p}~~")
            with ev_col:
                st.markdown("##### Evidence citations")
                for c in full["trust"]["citations"][:8]:
                    st.markdown(f"**{c['capability']}** — _\"…{c['evidence_span']}…\"_")

            st.markdown("##### WHO / NABH compliance audit")
            findings = full["audit"]["audit_findings"]
            for f in findings:
                with st.expander(f"**{f['capability']}** — {f['status']}"):
                    if list(f["missing_critical"]):
                        st.error("Missing critical: " + ", ".join(f["missing_critical"]))
                    if list(f["missing_recommended"]):
                        st.warning("Missing recommended: " + ", ".join(f["missing_recommended"]))
                    st.caption(f"Reference: {f['reference']}")
                    if list(f["retrieved_evidence"]):
                        st.markdown("**Vector-retrieved guideline:**")
                        for r in f["retrieved_evidence"]:
                            st.markdown(f"> _{r['title']}_ — {r['text'][:300]}…")

            st.markdown("##### P(True) confidence per capability")
            sc = pd.DataFrame(full["evaluation"]["scores"])
            if not sc.empty:
                st.dataframe(sc[["capability", "fused", "p_true_mean", "p_true_std", "consistency", "quarantined"]], hide_index=True, use_container_width=True)

            if list(full["trust"]["contradictions"]):
                st.markdown("##### Contradictions flagged by Trust Scorer")
                for c in full["trust"]["contradictions"]:
                    st.error(f"{c['rule']} — {c['message']}")
                    if c.get("citation"):
                        st.caption(f"Citation: {c['citation']}")


# ----------------------------- QUERY CONSOLE -----------------------------
with TAB_QUERY:
    st.markdown("### Multi-Attribute Reasoning Console")
    st.caption("Find the nearest facilities matching multiple capability constraints.")

    cols = st.columns(4)
    available_caps = sorted(set(c for tags in gold["raw_capability_tags"].dropna().tolist() for c in (list(tags) if tags is not None else [])))
    must_have = cols[0].multiselect("Must have", available_caps, default=["icu", "trauma"][: min(2, len(available_caps))])
    state = cols[1].selectbox("State", ["(any)"] + sorted(gold["address_stateOrRegion"].dropna().unique().tolist()))
    near_city = cols[2].text_input("Near city", value="")
    radius_km = cols[3].slider("Radius (km)", 5, 300, 50)

    matches = gold.copy()
    matches["tag_list"] = matches["raw_capability_tags"].apply(lambda t: list(t) if t is not None else [])
    if must_have:
        matches = matches[matches["tag_list"].apply(lambda tags: all(m in tags for m in must_have))]
    if state and state != "(any)":
        matches = matches[matches["address_stateOrRegion"] == state]

    if near_city:
        ref = gold[gold["address_city"].str.contains(near_city, case=False, na=False)]
        if not ref.empty:
            ref_lat, ref_lon = float(ref.iloc[0]["latitude"]), float(ref.iloc[0]["longitude"])
            matches["distance_km"] = matches.apply(lambda r: haversine_km(ref_lat, ref_lon, float(r["latitude"]), float(r["longitude"])), axis=1)
            matches = matches[matches["distance_km"] <= radius_km].sort_values("distance_km")
        else:
            st.warning(f"City '{near_city}' not found.")

    st.metric("Matching facilities", len(matches))
    cols_to_show = ["facility_id", "name", "address_city", "address_stateOrRegion", "tag_list"]
    if "distance_km" in matches.columns:
        cols_to_show.append("distance_km")
    st.dataframe(matches[cols_to_show].head(200), use_container_width=True, hide_index=True)


# ----------------------------- TRACE -------------------------------------
with TAB_TRACE:
    from aegis_net.observability.tracing import current_trace

    st.markdown("### Live Agent Chain-of-Thought Trace")
    traces = current_trace()
    st.caption(f"{len(traces)} spans captured (most recent first). Hook MLflow with `MLFLOW_TRACKING_URI` for persistent storage.")
    if traces:
        df_t = pd.DataFrame([{"name": t["name"], "duration_ms": t["duration_ms"]} for t in traces[::-1]])
        try:
            import plotly.express as px

            fig = px.bar(df_t.head(40), x="duration_ms", y="name", orientation="h", title="Recent agent span latencies")
            fig.update_layout(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)", font_color="#e8eaf6")
            st.plotly_chart(fig, use_container_width=True)
        except Exception:
            st.dataframe(df_t.head(40))
    if not dossier.empty:
        st.markdown("##### Pick a facility to view the full Chain-of-Verification trace")
        names = dossier["name"].tolist()
        sel = st.selectbox("Facility", names, key="trace_facility")
        full = dossier[dossier["name"] == sel].iloc[0].to_dict()
        cov = full["diagnostic"].get("cov", {})
        for phase in cov.get("reasoning_trace", []):
            with st.expander(f"Phase: {phase['phase']}"):
                st.json(phase, expanded=False)


# ----------------------------- DATA BROWSER ------------------------------
with TAB_DATA:
    st.markdown("### Gold Facility Table")
    st.caption("Bronze → Silver → Gold pipeline output. Filter, sort, and inspect.")
    state_pick = st.multiselect("State", sorted(gold["address_stateOrRegion"].dropna().unique().tolist()))
    type_pick = st.multiselect("Facility type", sorted(gold["facilityTypeId"].dropna().unique().tolist()))
    g = gold.copy()
    if state_pick:
        g = g[g["address_stateOrRegion"].isin(state_pick)]
    if type_pick:
        g = g[g["facilityTypeId"].isin(type_pick)]
    cols = ["facility_id", "name", "address_city", "address_stateOrRegion", "facilityTypeId", "completeness_score", "h3_index"]
    st.dataframe(g[cols].head(500), use_container_width=True, hide_index=True)

    st.markdown("##### State coverage")
    state_counts = gold["address_stateOrRegion"].value_counts().reset_index()
    state_counts.columns = ["State", "Facilities"]
    try:
        import plotly.express as px

        fig = px.bar(state_counts.head(20), x="State", y="Facilities", title="Top 20 states by facility count")
        fig.update_layout(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)", font_color="#e8eaf6")
        st.plotly_chart(fig, use_container_width=True)
    except Exception:
        st.bar_chart(state_counts.set_index("State"))


st.markdown(
    """
    <div style='text-align:center; opacity:0.6; padding-top:2rem'>
        Aegis-Net • Compound AI on Databricks • Agno multi-agent + Mosaic AI Vector Search + H3 + E2SFCA + MLflow 3
    </div>
    """,
    unsafe_allow_html=True,
)
