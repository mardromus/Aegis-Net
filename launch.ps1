# Aegis-Net full-stack launcher (backend + frontend)
# Usage: .\launch.ps1
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Aegis-Net Command Centre" -ForegroundColor Cyan
Write-Host " Compound AI for Indian Healthcare" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Free ports if previous instances are running
foreach ($port in 8000, 3000) {
    $existing = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($existing) {
        Write-Host "Freeing port $port (killing PID $($existing -join ', '))..." -ForegroundColor Yellow
        Stop-Process -Id $existing -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

# 2. Ensure pipeline outputs exist
$gold = "data\gold\facilities_gold.parquet"
if (-not (Test-Path $gold)) {
    Write-Host "Gold pipeline outputs missing — running full pipeline..." -ForegroundColor Yellow
    python scripts\run_pipeline.py --sample 100
} else {
    Write-Host "Pipeline outputs detected." -ForegroundColor Green
}

# 3. Launch FastAPI backend
Write-Host ""
Write-Host "[1/2] Starting FastAPI backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
$backend = Start-Process -PassThru -WindowStyle Hidden -FilePath "python" -ArgumentList @(
    "-m", "uvicorn", "backend.main:app",
    "--host", "127.0.0.1",
    "--port", "8000",
    "--no-access-log"
)
Start-Sleep -Seconds 3

# 4. Launch Next.js frontend
Write-Host "[2/2] Starting Next.js frontend on http://localhost:3000 ..." -ForegroundColor Cyan
$frontend = Start-Process -PassThru -FilePath "cmd" -ArgumentList @(
    "/c", "cd frontend && npm run dev"
)

Start-Sleep -Seconds 4
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " READY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host " Backend  : http://127.0.0.1:8000" -ForegroundColor Green
Write-Host " Frontend : http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host " Press Ctrl+C in each window to stop." -ForegroundColor Yellow
Write-Host " Or close all instances with: Get-Process python,node | Stop-Process -Force" -ForegroundColor Yellow
Write-Host ""

# 5. Open browser
Start-Sleep -Seconds 6
Start-Process "http://localhost:3000"

# 6. Keep this terminal alive (Ctrl+C to exit)
Wait-Process -Id $backend.Id, $frontend.Id -ErrorAction SilentlyContinue
