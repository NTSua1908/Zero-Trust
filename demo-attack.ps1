# Zero Trust Demo - Token Theft Attack Scenario
# This script demonstrates what happens when an attacker steals a token

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Demo: Token Theft Attack" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This demo shows:" -ForegroundColor Yellow
Write-Host "  1. Legitimate user logs in and gets token" -ForegroundColor White
Write-Host "  2. Attacker steals the token" -ForegroundColor Red
Write-Host "  3. Attacker tries to use stolen token" -ForegroundColor Red
Write-Host "  4. Request fails due to missing private key" -ForegroundColor Green
Write-Host ""

$GATEWAY_URL = "http://localhost:4002"

$attackScript = @"
const crypto = require('./shared/crypto');
const axios = require('axios');

const GATEWAY_URL = '$GATEWAY_URL';

async function demo() {
  console.log('\n=== LEGITIMATE USER ===\n');
  
  // Step 1: Legitimate user creates account
  console.log('STEP 1: User generates keypair and registers');
  const legitKeyPair = crypto.generateECDSAKeyPair();
  const username = 'victim_' + Date.now();
  
  const registerRes = await axios.post(\`\${GATEWAY_URL}/register\`, {
    username: username,
    publicKey: legitKeyPair.publicKey
  });
  console.log('[OK] User registered:', username);
  
  // Step 2: User logs in
  console.log('\nSTEP 2: User logs in with signature');
  const timestamp = Math.floor(Date.now() / 1000);
  const loginData = { username, timestamp };
  const signature = crypto.signWithPrivateKey(loginData, legitKeyPair.privateKey);
  
  const loginRes = await axios.post(\`\${GATEWAY_URL}/login\`, {
    username,
    timestamp,
    signature
  });
  const stolenToken = loginRes.data.token;
  console.log('[OK] Login successful!');
  console.log('[OK] Token received:', stolenToken.substring(0, 50) + '...');
  
  // Step 3: Simulate token theft
  console.log('\n=== ATTACKER ===\n');
  console.log('[WARNING] Attacker steals the token through XSS/Network sniffing');
  console.log('[WARNING] Attacker has: Token = ' + stolenToken.substring(0, 30) + '...');
  console.log('[WARNING] Attacker does NOT have: Private Key');
  
  // Step 4: Attacker tries to use token
  console.log('\nSTEP 3: Attacker attempts to check balance using stolen token');
  
  // Attacker generates their own keypair (wrong one!)
  const attackerKeyPair = crypto.generateECDSAKeyPair();
  console.log('[ERROR] Attacker uses their own private key (not the victim\\'s)');
  
  const balanceData = {
    token: stolenToken,  // Stolen token
    data: { action: 'balance', timestamp: Math.floor(Date.now() / 1000) }
  };
  const paddedBalance = crypto.applyPadding(balanceData);
  const attackerSig = crypto.signWithPrivateKey(paddedBalance, attackerKeyPair.privateKey);
  
  try {
    await axios.post(\`\${GATEWAY_URL}/api/balance\`, {
      meta: { timestamp: Math.floor(Date.now() / 1000), version: '1.0' },
      protected_payload: paddedBalance,
      user_signature: attackerSig
    });
    console.log('[ERROR] SECURITY BREACH! Attack succeeded!');
  } catch (error) {
    console.log('\n*** ATTACK BLOCKED! ***');
    console.log('[OK] Reason:', error.response?.data?.error || 'Signature verification failed');
    console.log('[OK] Layer:', error.response?.data?.layer || 'user_signature_verification');
    console.log('\nThe token alone is NOT enough!');
    console.log('Proof-of-Possession (Holder-of-Key) mechanism works!');
  }
  
  console.log('\n=== EXPLANATION ===');
  console.log('Even though the attacker has a valid token:');
  console.log('  1. The token proves the user is authenticated');
  console.log('  2. BUT the signature must match the public key in the token');
  console.log('  3. Only the legitimate user has the matching private key');
  console.log('  4. Therefore, stolen tokens are useless without the private key');
  console.log('\nThis is called: Holder-of-Key (Proof-of-Possession)');
  
  console.log('\n=== Demo Completed ===\n');
}

demo().catch(console.error);
"@

Set-Content -Path "demo-attack-temp.js" -Value $attackScript

Write-Host "Running attack simulation..." -ForegroundColor Yellow
Write-Host ""
node demo-attack-temp.js

Remove-Item "demo-attack-temp.js" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Demo completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Key Takeaway:" -ForegroundColor Yellow
Write-Host "  Token theft is NOT enough to compromise the system!" -ForegroundColor Green
Write-Host "  The attacker needs BOTH the token AND the private key." -ForegroundColor Green
Write-Host ""
