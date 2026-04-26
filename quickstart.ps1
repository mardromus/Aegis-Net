# Aegis-Net one-command quickstart (Windows PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "==> Installing minimum dependencies (~30s first time)..." -ForegroundColor Cyan
python -m pip install --quiet pandas openpyxl pyarrow h3 streamlit pydeck plotly numpy python-dotenv tqdm pytest

Write-Host "==> Running Bronze -> Silver -> Gold pipeline..." -ForegroundColor Cyan
python scripts\run_pipeline.py --data-only

Write-Host "==> Running multi-agent swarm on a 200-row sample..." -ForegroundColor Cyan
python scripts\run_pipeline.py --swarm-only --sample 200 --workers 12

Write-Host "==> Running E2SFCA geospatial engine..." -ForegroundColor Cyan
python scripts\run_pipeline.py --geo-only

Write-Host "==> Running tests..." -ForegroundColor Cyan
python -m pytest tests -q

Write-Host ""
Write-Host "==> All set. Launching the Aegis-Net Command Centre at http://localhost:8501" -ForegroundColor Green
python -m streamlit run app\streamlit_app.py
