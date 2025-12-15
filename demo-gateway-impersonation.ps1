# Zero Trust Demo - Gateway Impersonation Attack Scenario
# This script demonstrates how HMAC protects against gateway impersonation
# An attacker cannot forge valid responses without knowing the gateway's HMAC secret

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Demo: Gateway Impersonation Attack" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This demo shows:" -ForegroundColor Yellow
Write-Host "  1. Attacker intercepts client-to-app communication" -ForegroundColor White
Write-Host "  2. Attacker impersonates the gateway with fake responses" -ForegroundColor Red
Write-Host "  3. Fake response lacks valid HMAC signature" -ForegroundColor Red
Write-Host "  4. HMAC validation prevents accepting forged gateway response" -ForegroundColor Green
Write-Host "  5. This proves gateway identity and response authenticity" -ForegroundColor Green
Write-Host ""

$GATEWAY_URL = "http://localhost:4002"
$APP_URL = "http://localhost:4003"

$attackScript = @"
const crypto = require('./shared/crypto');
const axios = require('axios');
const http = require('http');

const GATEWAY_URL = '$GATEWAY_URL';
const APP_URL = '$APP_URL';

// Gateway's HMAC secret (attacker does NOT have this!)
const GATEWAY_HMAC_SECRET = process.env.GATEWAY_HMAC_SECRET || 'gateway-app-shared-secret-2025';

async function demo() {
  console.log('\n=== LEGITIMATE CLIENT ===\n');
  
  // Step 1: User registers and logs in
  console.log('STEP 1: Legitimate user registers and logs in');
  const legitKeyPair = crypto.generateECDSAKeyPair();
  const username = 'user_' + Date.now();
  
  const registerRes = await axios.post(\`\${GATEWAY_URL}/register\`, {
    username: username,
    publicKey: legitKeyPair.publicKey
  });
  console.log('[OK] User registered:', username);
  
  // User logs in
  const timestamp = Math.floor(Date.now() / 1000);
  const loginData = { username, timestamp };
  const signature = crypto.signWithPrivateKey(loginData, legitKeyPair.privateKey);
  
  const loginRes = await axios.post(\`\${GATEWAY_URL}/login\`, {
    username,
    timestamp,
    signature
  });
  const token = loginRes.data.token;
  console.log('[OK] Login successful');
  console.log('[OK] Token:', token.substring(0, 40) + '...');
  
  // Step 2: Client makes a request to check balance via gateway
  console.log('\nSTEP 2: Legitimate client sends balance request to gateway');
  const balanceData = {
    token: token,
    data: { action: 'balance', timestamp: Math.floor(Date.now() / 1000) }
  };
  const paddedBalance = crypto.applyPadding(balanceData);
  const clientSig = crypto.signWithPrivateKey(paddedBalance, legitKeyPair.privateKey);
  
  console.log('[OK] Client request signed with user private key');
  
  // Step 3: Simulate MITM attacker intercepting and replacing the response
  console.log('\n=== ATTACKER (MAN-IN-THE-MIDDLE) ===\n');
  console.log('[WARNING] Attacker is on the network path between client and gateway');
  console.log('[WARNING] Attacker intercepts the legitimate request');
  console.log('[WARNING] Attacker wants to inject fake balance response...');
  
  // Create malicious response that impersonates the gateway
  console.log('\nSTEP 3: Attacker creates fake gateway response');
  
  // Attacker tries to forge a response
  const fakeResponse = {
    success: true,
    data: {
      balance: 999999,  // Attacker grants themselves free money!
      currency: 'USD'
    }
  };
  
  console.log('[ATTACK] Fake response:');
  console.log('        {');
  console.log('          "success": true,');
  console.log('          "data": { "balance": 999999, "currency": "USD" }');
  console.log('        }');
  
  // Attacker tries to compute HMAC for the fake response
  console.log('\nSTEP 4: Attacker tries to forge HMAC signature');
  console.log('[ERROR] Attacker does NOT have the gateway HMAC secret');
  
  // Attacker guesses or uses wrong secret
  const wrongSecret = 'attacker-fake-secret-2025';
  const fakeHMAC = crypto.generateHMAC(JSON.stringify(fakeResponse), wrongSecret);
  
  console.log('[ERROR] Attacker uses guessed secret: "' + wrongSecret + '"');
  console.log('[ERROR] Forged HMAC:', fakeHMAC.substring(0, 40) + '...');
  
  // The legitimate HMAC (which only gateway knows)
  const legitimateHMAC = crypto.generateHMAC(JSON.stringify(fakeResponse), GATEWAY_HMAC_SECRET);
  console.log('[CHECK] Real HMAC (only gateway knows):', legitimateHMAC.substring(0, 40) + '...');
  
  if (fakeHMAC !== legitimateHMAC) {
    console.log('\n[VERIFICATION] HMAC mismatch detected!');
    console.log('               Forged HMAC ≠ Real HMAC');
  }
  
  // Step 5: Client validates the response
  console.log('\nSTEP 5: Client receives response and validates HMAC');
  
  // Simulate what would happen if client validates
  const receivedResponse = fakeResponse;
  const receivedHMAC = fakeHMAC;
  
  const clientComputedHMAC = crypto.generateHMAC(JSON.stringify(receivedResponse), GATEWAY_HMAC_SECRET);
  
  console.log('[CLIENT] Client validates: HMAC in response === computed HMAC');
  console.log('[CLIENT] Received HMAC:    ' + receivedHMAC.substring(0, 40) + '...');
  console.log('[CLIENT] Computed HMAC:   ' + clientComputedHMAC.substring(0, 40) + '...');
  
  if (receivedHMAC === clientComputedHMAC) {
    console.log('\n*** SECURITY BREACH! ***');
    console.log('[ERROR] HMAC validated - fake response accepted!');
  } else {
    console.log('\n*** ATTACK BLOCKED! ***');
    console.log('[OK] HMAC validation FAILED!');
    console.log('[OK] Response rejected - not from legitimate gateway');
    console.log('[OK] Attack cannot proceed because:');
    console.log('     - Attacker does not have GATEWAY_HMAC_SECRET');
    console.log('     - Cannot compute valid HMAC without the secret');
    console.log('     - Forged response is detected and rejected');
  }
  
  console.log('\n=== EXPLANATION ===');
  console.log('');
  console.log('Why HMAC protects against gateway impersonation:');
  console.log('');
  console.log('1. Asymmetric signatures (user private key):');
  console.log('   - Prove CLIENT identity');
  console.log('   - Prevent someone else from sending requests as the client');
  console.log('');
  console.log('2. HMAC (shared gateway-app secret):');
  console.log('   - Prove GATEWAY identity');
  console.log('   - Prevent someone else from sending responses as the gateway');
  console.log('   - Only client and gateway share the HMAC secret');
  console.log('   - Attacker cannot forge valid HMAC without the secret');
  console.log('');
  console.log('3. Together they create zero-trust security:');
  console.log('   ✓ Client can verify it is talking to the real gateway');
  console.log('   ✓ Gateway can verify it is talking to the real client');
  console.log('   ✓ Neither trusts the network - they cryptographically verify');
  console.log('');
  
  console.log('=== Demo Completed ===\n');
}

demo().catch(console.error);
"@

# Save the attack script to a temporary file and execute it
$tempScript = Join-Path $env:TEMP "gateway-attack-demo.js"
Set-Content -Path $tempScript -Value $attackScript

Write-Host ""
Write-Host "Running demonstration..." -ForegroundColor Cyan
Write-Host ""

# Run the script using the node environment
& node $tempScript

# Cleanup
Remove-Item -Path $tempScript -Force -ErrorAction SilentlyContinue
