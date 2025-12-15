# Zero Trust Demo - Traffic Analysis Prevention
# This script demonstrates how padding prevents traffic analysis

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Demo: Traffic Analysis Prevention" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This demo shows:" -ForegroundColor Yellow
Write-Host "  1. Different actions (balance, transfer, history)" -ForegroundColor White
Write-Host "  2. Without padding: Different packet sizes" -ForegroundColor Red
Write-Host "  3. With padding: All packets are same size (4KB)" -ForegroundColor Green
Write-Host "  4. Attacker cannot guess action from packet size" -ForegroundColor Green
Write-Host ""

$paddingScript = @"
const crypto = require('./shared/crypto');

console.log('\n=== WITHOUT PADDING ===\n');

const smallData = {
  token: 'eyJhbGc...',
  data: { action: 'balance' }
};

const mediumData = {
  token: 'eyJhbGc...',
  data: { 
    action: 'transfer',
    receiver: 'user123',
    amount: 100000
  }
};

const largeData = {
  token: 'eyJhbGc...',
  data: {
    action: 'history',
    filters: {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      minAmount: 0,
      maxAmount: 1000000,
      includeMetadata: true
    }
  }
};

console.log('Balance request size:', Buffer.byteLength(JSON.stringify(smallData)), 'bytes');
console.log('Transfer request size:', Buffer.byteLength(JSON.stringify(mediumData)), 'bytes');
console.log('History request size:', Buffer.byteLength(JSON.stringify(largeData)), 'bytes');

console.log('\n[WARNING] Attacker can guess:');
console.log('  - Small packet (~100 bytes) = Balance check');
console.log('  - Medium packet (~200 bytes) = Transfer');
console.log('  - Large packet (~400 bytes) = History query');

console.log('\n=== WITH PADDING (4KB target) ===\n');

const paddedSmall = crypto.applyPadding(smallData, 4096);
const paddedMedium = crypto.applyPadding(mediumData, 4096);
const paddedLarge = crypto.applyPadding(largeData, 4096);

console.log('Balance request size:', Buffer.byteLength(JSON.stringify(paddedSmall)), 'bytes');
console.log('Transfer request size:', Buffer.byteLength(JSON.stringify(paddedMedium)), 'bytes');
console.log('History request size:', Buffer.byteLength(JSON.stringify(paddedLarge)), 'bytes');

console.log('\n[OK] All packets are similar size!');
console.log('[OK] Attacker cannot determine the action');
console.log('[OK] Traffic analysis is prevented');

console.log('\n=== Padding Details ===\n');
console.log('Original data size:', paddedSmall.originalSize, 'bytes');
console.log('Padding added:', paddedSmall.padding.length / 2, 'bytes (hex encoded)');
console.log('Total packet size:', Buffer.byteLength(JSON.stringify(paddedSmall)), 'bytes');

console.log('\n=== Security Benefits ===');
console.log('1. Prevents timing attacks based on packet size');
console.log('2. Hides the type of operation being performed');
console.log('3. Makes traffic analysis significantly harder');
console.log('4. Protects user privacy and operational security');

console.log('\n=== Demo Completed ===\n');
"@

Set-Content -Path "demo-padding-temp.js" -Value $paddingScript

Write-Host "Running padding demo..." -ForegroundColor Yellow
Write-Host ""
node demo-padding-temp.js

Remove-Item "demo-padding-temp.js" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Demo completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
