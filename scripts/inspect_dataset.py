"""Quick dataset inspection for Aegis-Net pipeline design."""
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "VF_Hackathon_Dataset_India_Large.xlsx"

xls = pd.ExcelFile(XLSX)
print("Sheets:", xls.sheet_names)

for s in xls.sheet_names:
    df = pd.read_excel(XLSX, sheet_name=s)
    print("\n===", s, "===")
    print("shape:", df.shape)
    print("cols:", list(df.columns))
    print(df.head(2).to_string())
    if len(df) > 2:
        print("\n--- nulls per col ---")
        print(df.isna().sum().to_string())
