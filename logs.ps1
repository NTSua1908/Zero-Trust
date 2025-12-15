# Zero Trust Demo - View Logs
# This script shows logs from all services

param(
    [string]$Service = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Zero Trust Demo - Logs Viewer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($Service -eq "") {
    Write-Host "Showing logs from all services..." -ForegroundColor Yellow
    Write-Host "(Press Ctrl+C to stop)" -ForegroundColor Gray
    Write-Host ""
    docker compose logs -f
} else {
    Write-Host "Showing logs from: $Service" -ForegroundColor Yellow
    Write-Host "(Press Ctrl+C to stop)" -ForegroundColor Gray
    Write-Host ""
    docker compose logs -f $Service
}
