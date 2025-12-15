# ============================================
# Web UI Starter Script
# ============================================
# Khoi dong Web UI de tuong tac voi he thong Zero Trust

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "  Zero Trust Web UI Starter" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend services are running
Write-Host "[INFO] Checking backend services..." -ForegroundColor Yellow

$servicesOk = $true

# Check AAA Server
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4001/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] AAA Server is running (port 4001)" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] AAA Server not responding on port 4001" -ForegroundColor Yellow
    $servicesOk = $false
}

# Check Gateway
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4002/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] Gateway is running (port 4002)" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Gateway not responding on port 4002" -ForegroundColor Yellow
    $servicesOk = $false
}

# Check App Service
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4003/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] App Service is running (port 4003)" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] App Service not responding on port 4003" -ForegroundColor Yellow
    $servicesOk = $false
}

Write-Host ""

if (-not $servicesOk) {
    Write-Host "[WARNING] Some backend services are not running!" -ForegroundColor Yellow
    Write-Host "[INFO] Please start backend services first:" -ForegroundColor Yellow
    Write-Host "  .\start.ps1          (Docker mode)" -ForegroundColor Cyan
    Write-Host "  .\start-local.ps1    (Local mode)" -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "[INFO] Startup cancelled" -ForegroundColor Yellow
        exit 1
    }
}

# Check if web-ui directory exists
if (-not (Test-Path "web-ui")) {
    Write-Host "[ERROR] web-ui directory not found!" -ForegroundColor Red
    exit 1
}

# Navigate to web-ui directory
Set-Location "web-ui"

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing Web UI dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "[OK] Starting Web UI server..." -ForegroundColor Green
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "  Web UI: http://localhost:3000" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] Open your browser and visit the URL above" -ForegroundColor Yellow
Write-Host "[INFO] Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
node server.js
