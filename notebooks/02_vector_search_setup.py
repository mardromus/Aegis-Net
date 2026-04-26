# Databricks notebook source
# MAGIC %md
# MAGIC # Aegis-Net • Phase 2: Mosaic AI Vector Search
# MAGIC
# MAGIC Embeds the WHO/NABH/AERB guideline corpus and registers it as a Unity-Catalog-governed
# MAGIC vector index, exposed to agents via the Model Context Protocol (MCP).

# COMMAND ----------
dbutils.widgets.text("catalog", "main")
dbutils.widgets.text("schema", "aegis")
dbutils.widgets.text("vector_endpoint", "aegis_vector_endpoint")
dbutils.widgets.text("vector_index", "main.aegis.medical_knowledge_index")

CATALOG = dbutils.widgets.get("catalog")
SCHEMA = dbutils.widgets.get("schema")
ENDPOINT = dbutils.widgets.get("vector_endpoint")
INDEX = dbutils.widgets.get("vector_index")

# COMMAND ----------
# MAGIC %pip install -q databricks-vectorsearch mlflow

# COMMAND ----------
import sys
sys.path.insert(0, "/Workspace/Repos/aegis-net")
from aegis_net.knowledge.corpus import MEDICAL_CORPUS

import pandas as pd
df = pd.DataFrame(MEDICAL_CORPUS)
sdf = spark.createDataFrame(df)
src_table = f"{CATALOG}.{SCHEMA}.medical_knowledge_source"
sdf.write.mode("overwrite").option("delta.enableChangeDataFeed", "true").saveAsTable(src_table)
print(f"Wrote source table {src_table} with {sdf.count()} chunks")

# COMMAND ----------
from databricks.vector_search.client import VectorSearchClient

vsc = VectorSearchClient(disable_notice=True)
endpoints = {e["name"] for e in vsc.list_endpoints().get("endpoints", [])}
if ENDPOINT not in endpoints:
    print(f"Creating endpoint {ENDPOINT}…")
    vsc.create_endpoint(name=ENDPOINT, endpoint_type="STANDARD")
print("Endpoint ready.")

# COMMAND ----------
existing = {ix["name"] for ix in vsc.list_indexes(name=ENDPOINT).get("vector_indexes", [])}
if INDEX in existing:
    print(f"Index {INDEX} already exists.")
else:
    vsc.create_delta_sync_index(
        endpoint_name=ENDPOINT,
        source_table_name=src_table,
        index_name=INDEX,
        primary_key="id",
        embedding_source_column="text",
        embedding_model_endpoint_name="databricks-bge-large-en",
        pipeline_type="TRIGGERED",
    )
    print(f"Index {INDEX} creation triggered. Wait until it's ONLINE.")

# COMMAND ----------
# MAGIC %md
# MAGIC ## Smoke test the index

# COMMAND ----------
ix = vsc.get_index(endpoint_name=ENDPOINT, index_name=INDEX)
res = ix.similarity_search(query_text="ICU infrastructure requirements", columns=["id", "title", "text"], num_results=3)
display(res)
