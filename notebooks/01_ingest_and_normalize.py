# Databricks notebook source
# MAGIC %md
# MAGIC # Aegis-Net • Phase 1: Autonomous Data Engineering
# MAGIC
# MAGIC Genie Code in **Agent Mode** generates this Spark Declarative Pipeline (SDP):
# MAGIC the Virtue Foundation 10k facility Excel is parsed, list-as-string columns are
# MAGIC exploded, controlled-vocabulary capability tags are derived, and three Delta
# MAGIC tables are persisted under Unity Catalog.
# MAGIC
# MAGIC * `${catalog}.${schema}.facilities_bronze`
# MAGIC * `${catalog}.${schema}.facilities_silver`
# MAGIC * `${catalog}.${schema}.facilities_gold`

# COMMAND ----------
dbutils.widgets.text("catalog", "main")
dbutils.widgets.text("schema", "aegis")
dbutils.widgets.text("dataset_path", "/Volumes/main/aegis/raw/VF_Hackathon_Dataset_India_Large.xlsx")

CATALOG = dbutils.widgets.get("catalog")
SCHEMA = dbutils.widgets.get("schema")
DATASET = dbutils.widgets.get("dataset_path")

spark.sql(f"CREATE CATALOG IF NOT EXISTS {CATALOG}")
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA}")

# COMMAND ----------
# MAGIC %pip install -q openpyxl h3 sentence-transformers faiss-cpu mlflow

# COMMAND ----------
import sys
sys.path.insert(0, "/Workspace/Repos/aegis-net")  # adjust to your repo path
from aegis_net.ingestion.normalize import build_bronze, build_silver, build_gold
from aegis_net.config import CFG

# Override config to point at the Volume
import pathlib
CFG.raw_xlsx = pathlib.Path(DATASET)

bronze = build_bronze()
silver = build_silver(bronze)
gold = build_gold(silver)

# COMMAND ----------
# Persist as Delta tables under Unity Catalog
spark_bronze = spark.createDataFrame(bronze.astype(str))
spark_silver = spark.createDataFrame(silver.astype(str))
spark_gold = spark.createDataFrame(gold.astype(str))

spark_bronze.write.mode("overwrite").saveAsTable(f"{CATALOG}.{SCHEMA}.facilities_bronze")
spark_silver.write.mode("overwrite").saveAsTable(f"{CATALOG}.{SCHEMA}.facilities_silver")
spark_gold.write.mode("overwrite").saveAsTable(f"{CATALOG}.{SCHEMA}.facilities_gold")

print(f"bronze rows: {spark_bronze.count()}")
print(f"silver rows: {spark_silver.count()}")
print(f"gold rows:   {spark_gold.count()}")

# COMMAND ----------
display(spark_gold.limit(5))
