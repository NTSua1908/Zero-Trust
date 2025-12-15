# Zero Trust Demo - Start Client
# This script starts the interactive client application

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Zero Trust Client" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if services are running
Write-Host "Checking if services are running..." -ForegroundColor Yellow

$servicesOk = $true

# Check AAA Server
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4001/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] AAA Server is running" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] AAA Server not responding" -ForegroundColor Yellow
    $servicesOk = $false
}

# Check Gateway
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4002/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] Gateway is running" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Gateway not responding" -ForegroundColor Yellow
    $servicesOk = $false
}

# Check App Service
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4003/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] App Service is running" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] App Service not responding" -ForegroundColor Yellow
    $servicesOk = $false
}

if (-not $servicesOk) {
    Write-Host ""
    Write-Host "[WARNING] Some services are not running!" -ForegroundColor Yellow
    Write-Host "Please start services first:" -ForegroundColor Yellow
    Write-Host "  .\start.ps1" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

Write-Host ""
Write-Host "Starting client..." -ForegroundColor Yellow
Write-Host ""

# Change to client directory and run
Set-Location "client"
node index.js
Set-Location ".."

Write-Host ""
Write-Host "Client closed." -ForegroundColor Gray
