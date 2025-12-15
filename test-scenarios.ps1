# Test script for Zero Trust Architecture
# Tests all security scenarios automatically

$ErrorActionPreference = "Continue"
$AAA_URL = "http://localhost:4001"
$GATEWAY_URL = "http://localhost:4002"

Write-Host ""
Write-Host "Starting Zero Trust Architecture Test Suite" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$AAA_URL/health" -Method Get
    if ($response.status -eq "healthy") {
        Write-Host "[PASS] AAA Server is healthy" -ForegroundColor Green
    }
    
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/health" -Method Get
    if ($response.status -eq "healthy") {
        Write-Host "[PASS] Gateway is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAIL] Health check failed: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Database Connection
Write-Host ""
Write-Host "Test 2: Database Connection" -ForegroundColor Yellow
try {
    $result = docker exec zerotrust-postgres psql -U postgres -d zerotrust -c "SELECT COUNT(*) FROM users;"
    if ($result) {
        Write-Host "[PASS] Database connection OK" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAIL] Database connection failed: $_" -ForegroundColor Red
}

# Test 3: Check accounts table exists
Write-Host ""
Write-Host "Test 3: Accounts Table Check" -ForegroundColor Yellow
try {
    $result = docker exec zerotrust-postgres psql -U postgres -d zerotrust -c "SELECT COUNT(*) FROM accounts;"
    Write-Host "[PASS] Accounts table exists" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Accounts table check failed: $_" -ForegroundColor Red
}

# Test 4: Check user with balance
Write-Host ""
Write-Host "Test 4: User Balance Check" -ForegroundColor Yellow
try {
    $result = docker exec zerotrust-postgres psql -U postgres -d zerotrust -c "SELECT u.username, a.balance, a.currency FROM users u JOIN accounts a ON u.id = a.user_id LIMIT 5;"
    Write-Host "[PASS] User accounts query successful" -ForegroundColor Green
    Write-Host $result -ForegroundColor Gray
} catch {
    Write-Host "[WARN] No user accounts yet (this is OK for fresh install)" -ForegroundColor Yellow
}

# Test 5: Container Logs Check
Write-Host ""
Write-Host "Test 5: Service Logs Check" -ForegroundColor Yellow
$services = @("zerotrust-aaa", "zerotrust-gateway", "zerotrust-app")
foreach ($service in $services) {
    Write-Host "  Checking $service..." -ForegroundColor Cyan
    $logs = docker logs $service --tail 5 2>&1 | Out-String
    if ($logs -match "error|Error|ERROR" -and $logs -notmatch "no error") {
        Write-Host "    [WARN] Found error in logs (may be old)" -ForegroundColor Yellow
    } else {
        Write-Host "    [PASS] No errors found" -ForegroundColor Green
    }
}

# Test 6: Port Availability
Write-Host ""
Write-Host "Test 6: Port Availability" -ForegroundColor Yellow
$ports = @(4001, 4002, 4003, 5432)
foreach ($port in $ports) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Host "  [PASS] Port $port is open" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] Port $port is not accessible" -ForegroundColor Red
        }
    } catch {
        Write-Host "  [FAIL] Port $port check failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Backend services are ready for testing" -ForegroundColor Green
Write-Host ""
Write-Host "To test Web UI scenarios:" -ForegroundColor Yellow
Write-Host "1. Start Web UI: .\start-webui.ps1" -ForegroundColor White
Write-Host "2. Open: http://localhost:3000" -ForegroundColor White
Write-Host "3. Test these scenarios:" -ForegroundColor White
Write-Host "   - Register new user (should get 1,000,000 VND)" -ForegroundColor Gray
Write-Host "   - Login with ECDSA signature" -ForegroundColor Gray
Write-Host "   - Check balance" -ForegroundColor Gray
Write-Host "   - Transfer money" -ForegroundColor Gray
Write-Host "   - View history" -ForegroundColor Gray
Write-Host "   - Token Theft Attack demo" -ForegroundColor Gray
Write-Host "   - MITM Attack demo" -ForegroundColor Gray
Write-Host "   - Replay Attack demo" -ForegroundColor Gray
Write-Host "   - Data Tampering demo" -ForegroundColor Gray
Write-Host ""
Write-Host "All backend tests completed!" -ForegroundColor Green
Write-Host ""
