# Zero Trust Demo - Setup Script
# This script sets up the entire Zero Trust architecture demo

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Zero Trust Demo - Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "[OK] Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker not found! Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "  Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
Write-Host "Checking if Docker is running..." -ForegroundColor Yellow
try {
    $dockerTest = docker ps 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Docker is not running or not installed" -ForegroundColor Yellow
    Write-Host "  Docker is optional for setup, but required to run services" -ForegroundColor Gray
    Write-Host "  You can continue with dependency installation" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Check if Docker Compose is available
Write-Host "Checking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker compose version
    Write-Host "[OK] Docker Compose found: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker Compose not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing Node.js dependencies..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Install shared dependencies
Write-Host ""
Write-Host "[1/5] Installing shared library dependencies..." -ForegroundColor Yellow
Set-Location "shared"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install shared dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Shared dependencies installed" -ForegroundColor Green

# Install AAA Server dependencies
Set-Location ".."
Write-Host ""
Write-Host "[2/5] Installing AAA Server dependencies..." -ForegroundColor Yellow
Set-Location "aaa-server"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install AAA Server dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] AAA Server dependencies installed" -ForegroundColor Green

# Install Gateway dependencies
Set-Location ".."
Write-Host ""
Write-Host "[3/5] Installing Gateway dependencies..." -ForegroundColor Yellow
Set-Location "gateway"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install Gateway dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Gateway dependencies installed" -ForegroundColor Green

# Install App Service dependencies
Set-Location ".."
Write-Host ""
Write-Host "[4/5] Installing App Service dependencies..." -ForegroundColor Yellow
Set-Location "app-service"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install App Service dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] App Service dependencies installed" -ForegroundColor Green

# Install Client dependencies
Set-Location ".."
Write-Host ""
Write-Host "[5/5] Installing Client dependencies..." -ForegroundColor Yellow
Set-Location "client"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install Client dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Client dependencies installed" -ForegroundColor Green

Set-Location ".."

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Setup completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run: .\start.ps1         - Start all services with Docker" -ForegroundColor White
Write-Host "  2. Run: .\start-local.ps1   - Start services without Docker" -ForegroundColor White
Write-Host "  3. Run: .\demo-*.ps1        - Run demo scenarios" -ForegroundColor White
Write-Host ""
