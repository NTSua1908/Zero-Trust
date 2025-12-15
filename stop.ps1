# Zero Trust Demo - Stop Script
# This script stops all Docker services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Stopping Zero Trust Demo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Stopping services..." -ForegroundColor Yellow
docker compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] All services stopped" -ForegroundColor Green
    Write-Host ""
    Write-Host "To remove all data (including database):" -ForegroundColor Yellow
    Write-Host "  docker compose down -v" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[ERROR] Failed to stop services" -ForegroundColor Red
    exit 1
}
