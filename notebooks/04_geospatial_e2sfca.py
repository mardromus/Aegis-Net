# Databricks notebook source
# MAGIC %md
# MAGIC # Aegis-Net • Phase 4: Geospatial Engine (H3 + E2SFCA)
# MAGIC
# MAGIC Maps audited facilities onto H3 hexagons and computes Enhanced Two-Step
# MAGIC Floating Catchment Area accessibility per capability.

# COMMAND ----------
dbutils.widgets.text("catalog", "main")
dbutils.widgets.text("schema", "aegis")
CATALOG = dbutils.widgets.get("catalog")
SCHEMA = dbutils.widgets.get("schema")

# COMMAND ----------
# MAGIC %pip install -q h3

# COMMAND ----------
import sys
sys.path.insert(0, "/Workspace/Repos/aegis-net")

from aegis_net.geo.e2sfca import compute_e2sfca, demand_grid_from_facilities
from aegis_net.geo.h3_index import attach_h3
import pandas as pd

gold = spark.table(f"{CATALOG}.{SCHEMA}.facilities_gold").toPandas()
gold["latitude"] = pd.to_numeric(gold["latitude"], errors="coerce")
gold["longitude"] = pd.to_numeric(gold["longitude"], errors="coerce")
gold = gold.dropna(subset=["latitude", "longitude"])
gold = attach_h3(gold)
demand = demand_grid_from_facilities(gold)
print(f"Facilities: {len(gold)} | Demand hexagons: {len(demand)}")

# COMMAND ----------
CAPABILITIES = ["icu", "trauma", "neurosurgery", "cardiology", "dialysis", "oncology", "maternity", "neonatal", "imaging_ct", "imaging_mri"]

import json
results = {}
for cap in CAPABILITIES:
    res = compute_e2sfca(facilities=gold, demand=demand, capability=cap)
    results[cap] = res
    access_df = pd.DataFrame(res["accessibility"])
    sdf = spark.createDataFrame(access_df.astype(str))
    sdf.write.mode("overwrite").saveAsTable(f"{CATALOG}.{SCHEMA}.e2sfca_{cap}")
    desert_pct = access_df["desert"].astype(bool).mean() * 100
    print(f"{cap:15s}  providers={int((gold['raw_capability_tags'].apply(lambda t: cap in (list(t) if t is not None else []))).sum()):4d}  desert%={desert_pct:5.1f}%")

# COMMAND ----------
# MAGIC %md
# MAGIC ### Inspect dialysis access (worst-served capability)

# COMMAND ----------
display(spark.table(f"{CATALOG}.{SCHEMA}.e2sfca_dialysis"))
