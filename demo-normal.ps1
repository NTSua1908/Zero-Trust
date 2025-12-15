# Zero Trust Demo - Normal User Scenario
# This script demonstrates normal login and transfer flow

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Demo: Normal User Flow" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This demo shows:" -ForegroundColor Yellow
Write-Host "  1. User registration with ECDSA keypair" -ForegroundColor White
Write-Host "  2. Login with signature verification" -ForegroundColor White
Write-Host "  3. Check balance with 3-layer verification" -ForegroundColor White
Write-Host "  4. Transfer money with proof-of-possession" -ForegroundColor White
Write-Host ""

$GATEWAY_URL = "http://localhost:4002"

# Load crypto functions
Write-Host "Loading crypto library..." -ForegroundColor Yellow
$cryptoScript = @"
const crypto = require('./shared/crypto');
const axios = require('axios');

const GATEWAY_URL = '$GATEWAY_URL';

async function demo() {
  console.log('\n=== STEP 1: Generate Keypair ===');
  const keyPair = crypto.generateECDSAKeyPair();
  console.log('[OK] Private Key:', keyPair.privateKey.substring(0, 40) + '...');
  console.log('[OK] Public Key:', keyPair.publicKey.substring(0, 40) + '...');
  
  const username = 'demo_user_' + Date.now();
  
  console.log('\n=== STEP 2: Register User ===');
  try {
    const registerRes = await axios.post(\`\${GATEWAY_URL}/register\`, {
      username: username,
      publicKey: keyPair.publicKey
    });
    console.log('[OK] Registration successful!');
    console.log('  User ID:', registerRes.data.user.id);
  } catch (error) {
    console.error('[ERROR] Registration failed:', error.response?.data || error.message);
    return;
  }
  
  console.log('\n=== STEP 3: Login with ECDSA Signature ===');
  const timestamp = Math.floor(Date.now() / 1000);
  const loginData = { username, timestamp };
  const signature = crypto.signWithPrivateKey(loginData, keyPair.privateKey);
  console.log('[OK] Login request signed');
  
  let token;
  try {
    const loginRes = await axios.post(\`\${GATEWAY_URL}/login\`, {
      username,
      timestamp,
      signature
    });
    token = loginRes.data.token;
    console.log('[OK] Login successful!');
    console.log('  Token:', token.substring(0, 50) + '...');
  } catch (error) {
    console.error('[ERROR] Login failed:', error.response?.data || error.message);
    return;
  }
  
  console.log('\n=== STEP 4: Check Balance (3-Layer Verification) ===');
  const balanceData = {
    token: token,
    data: { action: 'balance', timestamp: Math.floor(Date.now() / 1000) }
  };
  const paddedBalance = crypto.applyPadding(balanceData);
  const balanceSig = crypto.signWithPrivateKey(paddedBalance, keyPair.privateKey);
  
  try {
    const balanceRes = await axios.post(\`\${GATEWAY_URL}/api/balance\`, {
      meta: { timestamp: Math.floor(Date.now() / 1000), version: '1.0' },
      protected_payload: paddedBalance,
      user_signature: balanceSig
    });
    console.log('[OK] Balance retrieved!');
    console.log('  Balance:', balanceRes.data.data.balance, balanceRes.data.data.currency);
    console.log('  Verification Layers:');
    console.log('    [OK] Gateway HMAC:', balanceRes.data.verification_layers.gateway_hmac);
    console.log('    [OK] Token:', balanceRes.data.verification_layers.token);
    console.log('    [OK] User Signature:', balanceRes.data.verification_layers.user_signature);
  } catch (error) {
    console.error('[ERROR] Balance check failed:', error.response?.data || error.message);
  }
  
  console.log('\n=== STEP 5: Transfer Money ===');
  const transferData = {
    token: token,
    data: {
      action: 'transfer',
      receiver: 'user1',
      amount: 50000,
      timestamp: Math.floor(Date.now() / 1000)
    }
  };
  const paddedTransfer = crypto.applyPadding(transferData);
  const transferSig = crypto.signWithPrivateKey(paddedTransfer, keyPair.privateKey);
  
  try {
    const transferRes = await axios.post(\`\${GATEWAY_URL}/api/transfer\`, {
      meta: { timestamp: Math.floor(Date.now() / 1000), version: '1.0' },
      protected_payload: paddedTransfer,
      user_signature: transferSig
    });
    console.log('[OK] Transfer successful!');
    console.log('  Transaction ID:', transferRes.data.data.transaction.id);
    console.log('  Amount:', transferRes.data.data.transaction.amount, 'VND');
    console.log('  New Balance:', transferRes.data.data.new_balance, 'VND');
  } catch (error) {
    console.error('[ERROR] Transfer failed:', error.response?.data?.error || error.message);
  }
  
  console.log('\n=== Demo Completed ===\n');
}

demo().catch(console.error);
"@

Set-Content -Path "demo-temp.js" -Value $cryptoScript

Write-Host "Running demo..." -ForegroundColor Yellow
Write-Host ""
node demo-temp.js

Remove-Item "demo-temp.js" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Demo completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
