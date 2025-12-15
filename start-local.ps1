# Zero Trust Demo - Start Script (Local Mode)
# This script starts all services locally without Docker

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting Zero Trust Demo" -ForegroundColor Cyan
Write-Host "   (Local Mode - No Docker)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is running
Write-Host "[WARNING] This mode requires PostgreSQL running on localhost:5432" -ForegroundColor Yellow
Write-Host "   Database: zerotrust, User: postgres, Password: postgres" -ForegroundColor Gray
Write-Host ""

$response = Read-Host "Do you want to continue? (y/n)"
if ($response -ne "y" -and $response -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
Write-Host ""

# Start AAA Server
Write-Host "[1/3] Starting AAA Server on port 4001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\aaa-server'; Write-Host '🔐 AAA Server' -ForegroundColor Cyan; node index.js"
Start-Sleep -Seconds 2

# Start Gateway
Write-Host "[2/3] Starting Gateway on port 4002..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\gateway'; Write-Host '🚪 Gateway' -ForegroundColor Cyan; node index.js"
Start-Sleep -Seconds 2

# Start App Service
Write-Host "[3/3] Starting App Service on port 4003..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\app-service'; Write-Host '🎯 App Service' -ForegroundColor Cyan; node index.js"
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Three terminal windows have been opened for:" -ForegroundColor Yellow
Write-Host "  [AAA] AAA Server   (port 4001)" -ForegroundColor White
Write-Host "  [GW]  Gateway      (port 4002)" -ForegroundColor White
Write-Host "  [APP] App Service  (port 4003)" -ForegroundColor White
Write-Host ""
Write-Host "To use the client:" -ForegroundColor Yellow
Write-Host "  cd client" -ForegroundColor White
Write-Host "  node index.js" -ForegroundColor White
Write-Host ""
Write-Host "To stop services:" -ForegroundColor Yellow
Write-Host "  Close the terminal windows or use Ctrl+C in each" -ForegroundColor White
Write-Host ""
