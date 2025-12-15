# Zero Trust Demo - Start Script (Docker)
# This script starts all services using Docker Compose

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting Zero Trust Demo" -ForegroundColor Cyan
Write-Host "   (Docker Mode)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerTest = docker ps 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not running! Please start Docker Desktop." -ForegroundColor Red
    Write-Host "  1. Open Docker Desktop application" -ForegroundColor Yellow
    Write-Host "  2. Wait for Docker to fully start" -ForegroundColor Yellow
    Write-Host "  3. Run this script again" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Building and starting services..." -ForegroundColor Yellow
Write-Host "(This may take a few minutes on first run)" -ForegroundColor Gray
Write-Host ""

# Build and start services
docker compose up --build -d 2>&1 | Out-String | Write-Host

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Failed to start services" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Docker Desktop is not running" -ForegroundColor White
    Write-Host "  - Port conflicts (4001, 4002, 4003, 5432 already in use)" -ForegroundColor White
    Write-Host "  - Insufficient system resources" -ForegroundColor White
    Write-Host ""
    Write-Host "Try:" -ForegroundColor Yellow
    Write-Host "  .\stop.ps1          - Stop any existing containers" -ForegroundColor White
    Write-Host "  docker ps -a        - Check running containers" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Services Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services are running on:" -ForegroundColor Yellow
Write-Host "  [AAA] AAA Server:   http://localhost:4001" -ForegroundColor White
Write-Host "  [GW]  Gateway:      http://localhost:4002" -ForegroundColor White
Write-Host "  [APP] App Service:  http://localhost:4003" -ForegroundColor White
Write-Host "  [DB]  PostgreSQL:   localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "To use the client:" -ForegroundColor Yellow
Write-Host "  cd client" -ForegroundColor White
Write-Host "  node index.js" -ForegroundColor White
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  .\logs.ps1" -ForegroundColor White
Write-Host ""
Write-Host "To stop services:" -ForegroundColor Yellow
Write-Host "  .\stop.ps1" -ForegroundColor White
Write-Host ""
Write-Host "To run demo scenarios:" -ForegroundColor Yellow
Write-Host "  .\demo-normal.ps1     - Normal login & transfer" -ForegroundColor White
Write-Host "  .\demo-attack.ps1     - Simulate token theft attack" -ForegroundColor White
Write-Host ""
