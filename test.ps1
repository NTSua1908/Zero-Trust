# Zero Trust Demo - Test Script
# This script tests all components of the system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Zero Trust System Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$testScript = @"
const axios = require('axios');

const AAA_URL = 'http://localhost:4001';
const GATEWAY_URL = 'http://localhost:4002';
const APP_URL = 'http://localhost:4003';

async function testHealthChecks() {
  console.log('=== Health Check Tests ===\n');
  
  const services = [
    { name: 'AAA Server', url: \`\${AAA_URL}/health\` },
    { name: 'Gateway', url: \`\${GATEWAY_URL}/health\` },
    { name: 'App Service', url: \`\${APP_URL}/health\` }
  ];
  
  let allHealthy = true;
  
  for (const service of services) {
    try {
      const response = await axios.get(service.url);
      if (response.data.status === 'healthy') {
        console.log(\`[OK] \${service.name}: HEALTHY\`);
      } else {
        console.log(\`[ERROR] \${service.name}: UNHEALTHY\`);
        allHealthy = false;
      }
    } catch (error) {
      console.log(\`[ERROR] \${service.name}: UNREACHABLE\`);
      allHealthy = false;
    }
  }
  
  return allHealthy;
}

async function testCryptoFunctions() {
  console.log('\n=== Crypto Functions Test ===\n');
  
  const crypto = require('./shared/crypto');
  
  try {
    // Test ECDSA
    console.log('Testing ECDSA keypair generation...');
    const keyPair = crypto.generateECDSAKeyPair();
    console.log('[OK] Keypair generated');
    
    console.log('Testing ECDSA signing...');
    const data = { test: 'data' };
    const signature = crypto.signWithPrivateKey(data, keyPair.privateKey);
    console.log('[OK] Signature created');
    
    console.log('Testing ECDSA verification...');
    const isValid = crypto.verifySignature(data, signature, keyPair.publicKey);
    if (isValid) {
      console.log('[OK] Signature verified');
    } else {
      console.log('[ERROR] Signature verification failed');
      return false;
    }
    
    // Test HMAC
    console.log('Testing HMAC generation...');
    const secret = 'test-secret';
    const hmac = crypto.generateHMAC(data, secret);
    console.log('[OK] HMAC generated');
    
    console.log('Testing HMAC verification...');
    const hmacValid = crypto.verifyHMAC(data, hmac, secret);
    if (hmacValid) {
      console.log('[OK] HMAC verified');
    } else {
      console.log('[ERROR] HMAC verification failed');
      return false;
    }
    
    // Test Padding
    console.log('Testing padding...');
    const paddedData = crypto.applyPadding(data, 4096);
    console.log('[OK] Padding applied');
    
    const originalData = crypto.removePadding(paddedData);
    if (JSON.stringify(originalData) === JSON.stringify(data)) {
      console.log('[OK] Padding removal successful');
    } else {
      console.log('[ERROR] Padding removal failed');
      return false;
    }
    
    // Test Token
    console.log('Testing JWT token...');
    const token = crypto.generateToken({ userId: 123 }, 'secret');
    console.log('[OK] Token generated');
    
    const payload = crypto.verifyToken(token, 'secret');
    if (payload && payload.userId === 123) {
      console.log('[OK] Token verified');
    } else {
      console.log('[ERROR] Token verification failed');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[ERROR] Crypto test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Starting system tests...\n');
  
  const healthCheckPassed = await testHealthChecks();
  const cryptoPassed = await testCryptoFunctions();
  
  console.log('\n=== Test Summary ===\n');
  console.log('Health Checks:', healthCheckPassed ? '[OK] PASSED' : '[ERROR] FAILED');
  console.log('Crypto Functions:', cryptoPassed ? '[OK] PASSED' : '[ERROR] FAILED');
  
  if (healthCheckPassed && cryptoPassed) {
    console.log('\n*** All tests passed! ***\n');
    process.exit(0);
  } else {
    console.log('\n*** Some tests failed ***\n');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test error:', error.message);
  process.exit(1);
});
"@

Set-Content -Path "test-temp.js" -Value $testScript

Write-Host "Running tests..." -ForegroundColor Yellow
Write-Host ""
node test-temp.js

$exitCode = $LASTEXITCODE

Remove-Item "test-temp.js" -ErrorAction SilentlyContinue

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   All tests passed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   Some tests failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure all services are running:" -ForegroundColor Yellow
    Write-Host "  .\start.ps1" -ForegroundColor White
    Write-Host ""
}
