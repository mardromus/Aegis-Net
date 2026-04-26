import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pandas as pd
from aegis_net.reasoning.chain_of_verification import ChainOfVerification

gold = pd.read_parquet(ROOT / "data/gold/facilities_gold.parquet")
row = gold.iloc[0]
print("Name:", row["name"], "City:", row["address_city"])
print("Raw tags:", row["raw_capability_tags"])
print("Evidence:")
print(row["evidence_text"][:800])
print()

cov = ChainOfVerification()
result = cov.run(facility_id=row["facility_id"], name=row["name"], source=row["evidence_text"])
print("Baseline:", result.baseline)
print("Questions:", result.questions[:5])
print("Answers (first 3):", result.answers[:3])
print("Final:", result.final_capabilities)
print("Pruned:", result.pruned)
