import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pandas as pd

dossier = pd.read_parquet(ROOT / "data/gold/facility_dossier.parquet")
print("Dossier shape:", dossier.shape)
print()

# Compute distributions
bands = dossier.apply(lambda r: r["trust"]["band"], axis=1).value_counts()
print("Trust bands:\n", bands)
print()

# Sort by trust score and show top + bottom
dossier = dossier.copy()
dossier["score"] = dossier.apply(lambda r: r["trust"]["trust_score"], axis=1)
dossier["caps"] = dossier.apply(lambda r: r["diagnostic"]["capabilities"], axis=1)
dossier["audited"] = dossier.apply(lambda r: r["audit"]["summary"]["tags_audited"], axis=1)
dossier["compliance"] = dossier.apply(lambda r: r["audit"]["summary"]["compliance_index"], axis=1)
dossier["contradictions"] = dossier.apply(lambda r: len(r["trust"]["contradictions"]), axis=1)

cols = ["facility_id", "name", "address_city", "score", "audited", "compliance", "contradictions", "caps"]
print("=== Top 5 trusted ===")
print(dossier.sort_values("score", ascending=False)[cols].head(5).to_string())
print("\n=== Bottom 5 (quarantined) ===")
print(dossier.sort_values("score")[cols].head(5).to_string())

print("\n=== Random facility full dossier ===")
row = dossier.sort_values("score", ascending=False).iloc[0].to_dict()
print("Name:", row["name"])
print("Capabilities:", row["caps"])
print("Audit findings (first 2):")
for f in row["audit"]["audit_findings"][:2]:
    print(" -", f["capability"], f["status"], "missing_critical=", f["missing_critical"])
print("Confidence (first 3):")
for s in row["evaluation"]["scores"][:3]:
    print(" -", s["capability"], "fused=", s["fused"], "p_true=", s["p_true_mean"])
print("Citations (first 3):")
for c in row["trust"]["citations"][:3]:
    print(" -", c)
