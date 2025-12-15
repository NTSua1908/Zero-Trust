# Manual Test Checklist - Zero Trust Web UI

## Preparation

- [ ] Backend services running: `docker ps` shows all 4 containers (postgres, aaa, gateway, app)
- [ ] Web UI started: `.\start-webui.ps1`
- [ ] Browser opened: http://localhost:3000
- [ ] Browser console open (F12) to see any errors

## Test 1: User Registration

**Steps:**

1. Enter username (e.g., "testuser1")
2. Click "Register"

**Expected Results:**

- [ ] Keys generated successfully (ECDSA secp256k1)
- [ ] Public key displayed
- [ ] Registration successful message
- [ ] User should have 1,000,000 VND initial balance
- [ ] UI switches to Login section
- [ ] Logs show registration details in JSON format

## Test 2: User Login

**Steps:**

1. Click "Login" button
2. Observe the signing process

**Expected Results:**

- [ ] Login request signed with ECDSA private key
- [ ] JWT token received
- [ ] Login successful message
- [ ] Security layers visualization shows Layer 1 & 2 verified
- [ ] Balance automatically checked and displayed: 1,000,000 VND
- [ ] Action buttons now visible
- [ ] Logs show request/response with signature

## Test 3: Check Balance

**Steps:**

1. Click "Check Balance" button

**Expected Results:**

- [ ] Request sent with 3-layer security (Gateway HMAC + Token + User Signature)
- [ ] All 3 layers show as "verified" in security visualization
- [ ] Balance displays correctly: 1,000,000 VND
- [ ] Logs show complete request body with protected_payload
- [ ] Response shows verification_layers status

## Test 4: Money Transfer (if 2 users available)

**Steps:**

1. Enter recipient username (e.g., "ho")
2. Enter amount (e.g., 50000)
3. Click "Transfer"

**Expected Results:**

- [ ] Transfer successful
- [ ] Balance updated and refreshed automatically
- [ ] Logs show transfer request with signed payload
- [ ] Response confirms transaction

## Test 5: View Transaction History

**Steps:**

1. Click "View Transaction History"

**Expected Results:**

- [ ] Transaction list displayed in logs
- [ ] Shows all transactions (sent/received)
- [ ] Each transaction has: ID, from, to, amount, timestamp

## Test 6: Security Demo - Token Theft Attack

**Steps:**

1. Click "🔓 Token Theft Attack" button
2. Observe attack simulation

**Expected Results:**

- [ ] Logs show "Simulating token theft attack"
- [ ] Request sent with valid token BUT no user signature
- [ ] Server rejects request
- [ ] Response error: "Missing user signature" or similar
- [ ] Security visualization shows Layer 1 & 2 pass, Layer 3 fails
- [ ] Message: "ATTACK BLOCKED!"

## Test 7: Security Demo - MITM Attack

**Steps:**

1. Click "🕵️ Man-in-the-Middle Attack" button
2. Observe attack simulation

**Expected Results:**

- [ ] Logs show attacker modifying recipient
- [ ] Original recipient: user2, Modified: attacker
- [ ] Server detects signature mismatch
- [ ] Request rejected
- [ ] Message: "ATTACK BLOCKED! Signature verification detected data tampering"
- [ ] Security visualization shows Layer 3 fails

## Test 8: Security Demo - Replay Attack

**Steps:**

1. Click "🔁 Replay Attack" button
2. Observe attack simulation

**Expected Results:**

- [ ] Logs show old timestamp (5 minutes ago)
- [ ] Server detects timestamp too old
- [ ] Request rejected
- [ ] Message: "ATTACK BLOCKED! Timestamp validation prevented replay attack"
- [ ] Security visualization shows Layer 1 fails (HMAC/timestamp)

## Test 9: Security Demo - Data Tampering

**Steps:**

1. Click "✏️ Data Tampering Attack" button
2. Observe attack simulation

**Expected Results:**

- [ ] Logs show amount modified: 10,000 VND → 1,000,000 VND
- [ ] Server detects signature doesn't match tampered data
- [ ] Request rejected
- [ ] Message: "ATTACK BLOCKED! Signature verification detected amount tampering"
- [ ] Security visualization shows Layer 3 fails

## Test 10: Register Different User

**Steps:**

1. Click "Register Different User" button
2. localStorage cleared
3. Enter new username
4. Register

**Expected Results:**

- [ ] Previous user logged out
- [ ] UI reset to registration form
- [ ] New user can register successfully
- [ ] New user also gets 1,000,000 VND
- [ ] Can login and use all features

## Test 11: Logout

**Steps:**

1. Click "Logout" button

**Expected Results:**

- [ ] User logged out
- [ ] Token cleared
- [ ] UI shows login form again
- [ ] Keys still in localStorage (can login again)

## Test 12: UI/UX Verification

**Checklist:**

- [ ] Logs show newest entries first (reverse chronological)
- [ ] JSON formatting in logs is readable and color-coded
- [ ] 2-column layout maintains equal width
- [ ] Long JSON content wraps properly (no horizontal scroll)
- [ ] Security layers visualization updates correctly
- [ ] Balance displays with Vietnamese format (1.000.000 VND)
- [ ] All buttons have tooltips on hover
- [ ] Color coding: Info (blue), Success (green), Error (red), Warning (orange)

## Test 13: Error Handling

**Test scenarios:**

- [ ] Try to login without registering first
- [ ] Try to transfer to non-existent user
- [ ] Try to transfer more than balance
- [ ] Try to use features without logging in
- [ ] Close backend services and observe error messages

## Test Results Summary

Date: ******\_\_\_******
Tester: ******\_\_\_******

Total Tests: 13
Passed: **_ / 13
Failed: _** / 13

Notes:

---

---

---
