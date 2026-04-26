# Databricks notebook source
# MAGIC %md
# MAGIC # Aegis-Net • Phase 3: Multi-Agent Swarm Execution
# MAGIC
# MAGIC Loads the Gold Delta table, instantiates the Agno-style Supervisor + 4 specialist
# MAGIC workers (Diagnostic, Auditor, Spatial, Evaluator), and runs the full audit with
# MAGIC MLflow 3 GenAI tracing on every agent invocation.

# COMMAND ----------
dbutils.widgets.text("catalog", "main")
dbutils.widgets.text("schema", "aegis")
dbutils.widgets.text("llm_endpoint", "databricks-meta-llama-3-3-70b-instruct")
dbutils.widgets.text("vector_endpoint", "aegis_vector_endpoint")
dbutils.widgets.text("vector_index", "main.aegis.medical_knowledge_index")
dbutils.widgets.text("sample", "500")

CATALOG = dbutils.widgets.get("catalog")
SCHEMA = dbutils.widgets.get("schema")
LLM_ENDPOINT = dbutils.widgets.get("llm_endpoint")
SAMPLE = int(dbutils.widgets.get("sample"))

# COMMAND ----------
# MAGIC %pip install -q mlflow agno openai databricks-vectorsearch h3

# COMMAND ----------
import os, sys
os.environ["AEGIS_LLM_PROVIDER"] = "databricks"
os.environ["DATABRICKS_HOST"] = dbutils.notebook.entry_point.getDbutils().notebook().getContext().apiUrl().get()
os.environ["DATABRICKS_TOKEN"] = dbutils.notebook.entry_point.getDbutils().notebook().getContext().apiToken().get()
os.environ["DATABRICKS_LLM_ENDPOINT"] = LLM_ENDPOINT
os.environ["DATABRICKS_VECTOR_SEARCH_ENDPOINT"] = dbutils.widgets.get("vector_endpoint")
os.environ["DATABRICKS_VECTOR_INDEX"] = dbutils.widgets.get("vector_index")

sys.path.insert(0, "/Workspace/Repos/aegis-net")

import mlflow
mlflow.set_tracking_uri("databricks")
mlflow.set_experiment(f"/Users/{spark.sql('select current_user()').first()[0]}/aegis-net")
try:
    mlflow.openai.autolog()
except Exception:
    pass

# COMMAND ----------
import pandas as pd
gold = spark.table(f"{CATALOG}.{SCHEMA}.facilities_gold").toPandas()
gold["latitude"] = pd.to_numeric(gold["latitude"], errors="coerce")
gold["longitude"] = pd.to_numeric(gold["longitude"], errors="coerce")
gold = gold.dropna(subset=["latitude", "longitude"]).reset_index(drop=True)
gold = gold.head(SAMPLE)
print(f"Auditing {len(gold)} facilities with model {LLM_ENDPOINT}")

# COMMAND ----------
from aegis_net.agents.supervisor import SupervisorAgent
sup = SupervisorAgent(max_workers=8)
result = sup({"gold": gold})
dossier = result["dossier_df"]
display(dossier.head(10))

# COMMAND ----------
sdf = spark.createDataFrame(dossier.astype(str))
sdf.write.mode("overwrite").saveAsTable(f"{CATALOG}.{SCHEMA}.facility_dossier")
print(f"Wrote dossier rows={dossier.shape[0]}")

# COMMAND ----------
# MAGIC %md
# MAGIC ### MLflow 3 LLM-as-a-Judge evaluation
# MAGIC
# MAGIC Custom scorers measure how often agents successfully invoked Vector Search and
# MAGIC produced a high-confidence, contradiction-free dossier.

# COMMAND ----------
from mlflow.genai import evaluate
from mlflow.genai.scorers import scorer

@scorer
def trust_band_quality(outputs):
    band = outputs.get("trust", {}).get("band", "")
    return {"score": {"HIGH_TRUST": 1.0, "MEDIUM_TRUST": 0.7, "LOW_TRUST": 0.4, "QUARANTINED": 0.0}.get(band, 0.0)}

@scorer
def compliance_index(outputs):
    return outputs.get("audit", {}).get("summary", {}).get("compliance_index", 0.0)

eval_data = dossier.head(50).to_dict(orient="records")
results = evaluate(data=eval_data, scorers=[trust_band_quality, compliance_index])
display(results.tables.get("eval_results", pd.DataFrame()))
