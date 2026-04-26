# Databricks notebook source
# MAGIC %md
# MAGIC # Aegis-Net • Phase 5: Kepler.gl Visualization
# MAGIC
# MAGIC Renders the medical-desert maps inline using `%mosaic_kepler`. Health planners
# MAGIC can filter the Kepler layers by capability to see exactly which PIN codes are
# MAGIC starved of dialysis, trauma, oncology, etc.

# COMMAND ----------
# MAGIC %pip install -q databricks-mosaic keplergl

# COMMAND ----------
dbutils.widgets.text("catalog", "main")
dbutils.widgets.text("schema", "aegis")
CATALOG = dbutils.widgets.get("catalog")
SCHEMA = dbutils.widgets.get("schema")

# COMMAND ----------
import mosaic as mos
mos.enable_mosaic(spark, dbutils)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Trauma desert
# MAGIC %sql
# MAGIC SELECT h3_index, accessibility, accessibility_norm, desert, lat, lon
# MAGIC FROM ${var.catalog}.${var.schema}.e2sfca_trauma

# COMMAND ----------
# MAGIC %%mosaic_kepler
# MAGIC e2sfca_trauma h3_index h3 5000

# COMMAND ----------
# MAGIC %md
# MAGIC ## Dialysis desert (the worst-served capability in India)

# COMMAND ----------
# MAGIC %%mosaic_kepler
# MAGIC e2sfca_dialysis h3_index h3 5000
