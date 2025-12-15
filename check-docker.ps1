# Check Docker Status
# This script checks if Docker Desktop is running properly

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Docker Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "1. Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] $dockerVersion" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Docker not found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   [ERROR] Docker not installed" -ForegroundColor Red
    Write-Host "   Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker daemon is running
Write-Host ""
Write-Host "2. Checking Docker daemon..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Docker daemon is running" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Docker daemon is not running" -ForegroundColor Red
        Write-Host ""
        Write-Host "   Please start Docker Desktop:" -ForegroundColor Yellow
        Write-Host "   1. Open Docker Desktop from Start Menu" -ForegroundColor White
        Write-Host "   2. Wait for the icon in system tray to stop animating" -ForegroundColor White
        Write-Host "   3. Try running this script again" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "   [ERROR] Cannot connect to Docker daemon" -ForegroundColor Red
    exit 1
}

# Check Docker Compose
Write-Host ""
Write-Host "3. Checking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker compose version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] $composeVersion" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Docker Compose not available" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   [ERROR] Docker Compose not found" -ForegroundColor Red
    exit 1
}

# Check running containers
Write-Host ""
Write-Host "4. Checking existing containers..." -ForegroundColor Yellow
$containers = docker ps -a --filter "name=zerotrust" --format "{{.Names}}: {{.Status}}" 2>&1
if ($LASTEXITCODE -eq 0 -and $containers) {
    Write-Host "   Found Zero Trust containers:" -ForegroundColor Cyan
    $containers | ForEach-Object { Write-Host "   - $_" -ForegroundColor White }
} else {
    Write-Host "   [OK] No Zero Trust containers found" -ForegroundColor Green
}

# Check port availability
Write-Host ""
Write-Host "5. Checking port availability..." -ForegroundColor Yellow
$ports = @(4001, 4002, 4003, 5432)
$portsInUse = @()

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        $portsInUse += $port
        Write-Host "   [WARNING] Port $port is in use" -ForegroundColor Yellow
    } else {
        Write-Host "   [OK] Port $port is available" -ForegroundColor Green
    }
}

if ($portsInUse.Count -gt 0) {
    Write-Host ""
    Write-Host "   Ports in use: $($portsInUse -join ', ')" -ForegroundColor Yellow
    Write-Host "   You may need to stop existing services or change ports" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Docker Status: Ready" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run:" -ForegroundColor Yellow
Write-Host "  .\start.ps1    - Start all services" -ForegroundColor White
Write-Host ""
