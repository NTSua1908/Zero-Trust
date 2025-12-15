// Configuration
const CONFIG = {
  GATEWAY_URL: "http://localhost:4002",
  AAA_URL: "http://localhost:4001",
};

// State Management
let state = {
  username: null,
  keyPair: null,
  token: null,
  isLoggedIn: false,
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Wait for libraries to load
  if (typeof elliptic === "undefined" || typeof CryptoJS === "undefined") {
    setTimeout(() => {
      log("🚀 Zero Trust Web UI initialized", "info");
      checkServices();
      loadStoredKeys();
    }, 500);
  } else {
    log("🚀 Zero Trust Web UI initialized", "info");
    checkServices();
    loadStoredKeys();
  }
});

// ============= Logging Functions =============
function log(message, type = "info", details = null) {
  const timestamp = new Date().toLocaleTimeString("vi-VN");
  const logEntry = document.createElement("div");
  logEntry.className = `log-entry ${type}`;

  let detailsHtml = "";
  if (details) {
    detailsHtml = `<div style="margin-top: 5px; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; font-size: 11px;">${formatDetails(
      details
    )}</div>`;
  }

  logEntry.innerHTML = `
        <div class="timestamp">[${timestamp}]</div>
        <div class="message">${message}</div>
        ${detailsHtml}
    `;

  const logsDiv = document.getElementById("logs");
  // Insert at the beginning instead of appending
  logsDiv.insertBefore(logEntry, logsDiv.firstChild);

  // Keep scroll at top (showing newest logs)
  const container = document.getElementById("logsContainer");
  container.scrollTop = 0;
}

function formatDetails(details) {
  if (typeof details === "string") return details;
  if (typeof details === "object") {
    // Format as pretty JSON
    try {
      const jsonStr = JSON.stringify(details, null, 2);
      return `<pre style="margin: 0; font-size: 11px; overflow-x: auto;">${jsonStr}</pre>`;
    } catch (e) {
      return String(details);
    }
  }
  return String(details);
}

function clearLogs() {
  document.getElementById("logs").innerHTML = "";
  log("🗑️ Logs cleared", "info");
}

// ============= Crypto Functions =============
async function generateKeyPair() {
  log("🔑 Generating ECDSA key pair (secp256k1)...", "info");

  // Using elliptic library (same as backend)
  const EC = elliptic.ec;
  const ec = new EC("secp256k1");

  const keyPair = ec.genKeyPair();
  const publicKey = keyPair.getPublic("hex");
  const privateKey = keyPair.getPrivate("hex");

  log("✅ Key pair generated successfully", "success", {
    "Public Key": publicKey.substring(0, 64) + "...",
    "Private Key": "[PROTECTED]",
    Algorithm: "ECDSA secp256k1",
  });

  return {
    publicKey: publicKey,
    privateKey: privateKey,
    keyPairObject: keyPair,
  };
}

function applyPadding(data, targetSize = 4096) {
  const dataStr = JSON.stringify(data);
  const dataSize = new Blob([dataStr]).size;

  if (dataSize >= targetSize) {
    return {
      data: data,
      padding: "",
      originalSize: dataSize,
    };
  }

  const paddingSize = targetSize - dataSize - 100;
  const padding = CryptoJS.lib.WordArray.random(paddingSize).toString();

  return {
    data: data,
    padding: padding,
    originalSize: dataSize,
  };
}

function signData(data, keyPair) {
  // Create hash of data (same as backend: JSON.stringify then SHA-256)
  const dataString = JSON.stringify(data);
  const hash = CryptoJS.SHA256(dataString);

  // Convert hash to array for elliptic (using WordArray)
  const hashArray = [];
  for (let i = 0; i < hash.words.length; i++) {
    const word = hash.words[i];
    hashArray.push((word >>> 24) & 0xff);
    hashArray.push((word >>> 16) & 0xff);
    hashArray.push((word >>> 8) & 0xff);
    hashArray.push(word & 0xff);
  }

  // Get the actual elliptic key pair object
  const EC = elliptic.ec;
  const ec = new EC("secp256k1");
  const key = ec.keyFromPrivate(keyPair.privateKey, "hex");

  // Sign with private key
  const signature = key.sign(hashArray);
  const signatureHex = signature.toDER("hex");

  return signatureHex;
}

function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToArrayBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

// ============= Service Check =============
async function checkServices() {
  log("🔍 Checking service availability...", "info");

  try {
    const response = await fetch(`${CONFIG.AAA_URL}/health`);
    if (response.ok) {
      document.getElementById("connectionStatus").textContent = "Online";
      document.getElementById("connectionStatus").className = "status online";
      log("✅ Services are online and ready", "success");
    }
  } catch (error) {
    document.getElementById("connectionStatus").textContent = "Offline";
    document.getElementById("connectionStatus").className = "status offline";
    log(
      "❌ Cannot connect to services. Please start the backend first.",
      "error"
    );
  }
}

// ============= Storage Functions =============
function saveKeys(username, keyPair) {
  const data = {
    username,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
  localStorage.setItem("zerotrust_keys", JSON.stringify(data));
  log("💾 Keys saved to browser storage", "success");
}

async function loadStoredKeys() {
  const stored = localStorage.getItem("zerotrust_keys");
  if (stored) {
    const data = JSON.parse(stored);
    state.username = data.username;
    state.keyPair = {
      publicKey: data.publicKey,
      privateKey: data.privateKey,
    };

    // Recreate elliptic key pair from hex
    try {
      const EC = elliptic.ec;
      const ec = new EC("secp256k1");
      const keyPair = ec.keyFromPrivate(data.privateKey, "hex");
      state.keyPair.keyPairObject = keyPair;

      log("📂 Loaded saved keys for user: " + data.username, "info");
    } catch (error) {
      log("⚠️ Could not load stored keys: " + error.message, "warning");
    }

    updateUI();

    // Show login option
    document.getElementById("registerSection").style.display = "none";
    document.getElementById("loginSection").style.display = "block";
  }
}

// ============= UI Updates =============
function updateUI() {
  if (state.isLoggedIn) {
    document.getElementById("userInfo").style.display = "block";
    document.getElementById("registerSection").style.display = "none";
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("actionsSection").style.display = "block";
    document.getElementById("balanceDisplay").style.display = "block";
    document.getElementById("securityLayers").style.display = "flex";

    document.getElementById("displayUsername").textContent = state.username;
    document.getElementById("displayPublicKey").textContent =
      state.keyPair.publicKey.substring(0, 32) + "...";
    document.getElementById("displayToken").textContent = state.token
      ? state.token.substring(0, 40) + "..."
      : "None";
  } else {
    document.getElementById("userInfo").style.display = state.username
      ? "block"
      : "none";
    document.getElementById("actionsSection").style.display = "none";
    document.getElementById("balanceDisplay").style.display = "none";
    document.getElementById("securityLayers").style.display = "none";

    if (state.username) {
      document.getElementById("displayUsername").textContent = state.username;
      document.getElementById("displayPublicKey").textContent =
        state.keyPair.publicKey.substring(0, 32) + "...";
    }
  }
}

function showSecurityLayers(layers) {
  const layerElements = ["layer1", "layer2", "layer3"];
  layerElements.forEach((id, index) => {
    const element = document.getElementById(id);
    if (layers[index]) {
      element.classList.add("verified");
    } else {
      element.classList.remove("verified");
    }
  });
}

// ============= API Functions =============
async function register() {
  const username = document.getElementById("registerUsername").value.trim();

  if (!username) {
    log("❌ Please enter a username", "error");
    return;
  }

  log("📝 Starting registration process...", "info", { Username: username });

  try {
    // Generate key pair
    const keyPair = await generateKeyPair();

    // Register with AAA server via Gateway
    const requestBody = {
      username,
      publicKey: keyPair.publicKey,
    };

    log("📤 Request Body (POST /register):", "info", requestBody);

    const response = await fetch(`${CONFIG.GATEWAY_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    log("📥 Response from server:", response.ok ? "success" : "error", result);

    if (response.ok) {
      state.username = username;
      state.keyPair = keyPair;
      saveKeys(username, keyPair);

      log("✅ Registration successful!", "success");

      // Show login section
      document.getElementById("registerSection").style.display = "none";
      document.getElementById("loginSection").style.display = "block";
      updateUI();
    } else {
      log("❌ Registration failed: " + result.error, "error");
    }
  } catch (error) {
    log("❌ Registration error: " + error.message, "error");
  }
}

async function login() {
  if (!state.username || !state.keyPair) {
    log("❌ No user data found. Please register first.", "error");
    return;
  }

  log("🔐 Starting login process...", "info", { Username: state.username });

  try {
    // Create login payload
    const timestamp = Date.now();
    const payload = {
      username: state.username,
      timestamp,
    };

    log("🖊️ Signing login request with ECDSA private key...", "info");

    // Sign the payload
    const signature = signData(payload, state.keyPair);

    const requestBody = {
      username: state.username,
      timestamp,
      signature,
    };

    log("📤 Request Body (POST /login):", "info", requestBody);
    log("🖊️ Payload được ký:", "info", {
      Signature: signature.substring(0, 64) + "...",
    });

    // Send login request
    const response = await fetch(`${CONFIG.GATEWAY_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: state.username,
        timestamp,
        signature,
      }),
    });

    const result = await response.json();

    log("📥 Response from server:", response.ok ? "success" : "error", result);

    if (response.ok && result.token) {
      state.token = result.token;
      state.isLoggedIn = true;

      log("✅ Login successful!", "success");

      showSecurityLayers([true, true, false]); // HMAC + Token verified
      updateUI();

      // Auto check balance
      setTimeout(() => checkBalance(), 500);
    } else {
      log("❌ Login failed: " + (result.error || "Unknown error"), "error");
    }
  } catch (error) {
    log("❌ Login error: " + error.message, "error");
  }
}

async function checkBalance() {
  if (!state.isLoggedIn) {
    log("❌ Please login first", "error");
    return;
  }

  log("💰 Checking account balance...", "info");

  try {
    // Create signed request
    const timestamp = Date.now();
    const payload = {
      username: state.username,
      timestamp,
      token: state.token,
    };

    // Sign ORIGINAL payload (before padding)
    const signature = signData(payload, state.keyPair);

    // Apply padding AFTER signing (4KB target)
    const paddedPayload = applyPadding(payload);

    // Format request for Gateway (protected_payload + user_signature)
    const requestBody = {
      protected_payload: paddedPayload,
      user_signature: signature,
      meta: {},
    };

    log("🔒 3-Layer Security:", "info", {
      "Layer 1": "Gateway HMAC wrapping",
      "Layer 2": "JWT Token authentication",
      "Layer 3": "ECDSA signature verification",
    });

    log("📤 Request Body (POST /api/balance):", "info", requestBody);

    const response = await fetch(`${CONFIG.GATEWAY_URL}/api/balance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    log("📥 Response from server:", response.ok ? "success" : "error", result);

    if (response.ok) {
      showSecurityLayers([true, true, true]); // All layers verified

      log("✅ All 3 layers verified successfully!", "success");

      // Update balance display
      const balance = result.data?.balance ?? result.balance ?? 0;
      document.getElementById("balanceAmount").textContent =
        balance.toLocaleString("vi-VN");
    } else {
      log("❌ Failed to get balance: " + result.error, "error");
    }
  } catch (error) {
    log("❌ Balance check error: " + error.message, "error");
  }
}

async function transfer() {
  const receiver = document.getElementById("transferReceiver").value.trim();
  const amount = parseInt(document.getElementById("transferAmount").value);

  if (!receiver || !amount || amount <= 0) {
    log("❌ Please enter valid receiver and amount", "error");
    return;
  }

  log("💸 Initiating transfer...", "info", {
    From: state.username,
    To: receiver,
    Amount: amount.toLocaleString("vi-VN") + " VND",
  });

  try {
    const timestamp = Date.now();
    const payload = {
      username: state.username,
      receiver,
      amount,
      timestamp,
      token: state.token,
    };

    // Sign ORIGINAL payload (before padding)
    const signature = signData(payload, state.keyPair);

    // Apply padding AFTER signing (4KB target)
    const paddedPayload = applyPadding(payload);

    // Format request for Gateway
    const requestBody = {
      protected_payload: paddedPayload,
      user_signature: signature,
      meta: {},
    };

    log("📤 Request Body (POST /api/transfer):", "info", requestBody);

    const response = await fetch(`${CONFIG.GATEWAY_URL}/api/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    log("📥 Response from server:", response.ok ? "success" : "error", result);

    if (response.ok) {
      showSecurityLayers([true, true, true]);

      log("✅ Transfer successful!", "success");

      // Update balance display
      const balance = result.data?.balance ?? result.balance ?? 0;
      document.getElementById("balanceAmount").textContent =
        balance.toLocaleString("vi-VN");

      // Clear form
      document.getElementById("transferReceiver").value = "";
      document.getElementById("transferAmount").value = "";
    } else {
      log("❌ Transfer failed: " + result.error, "error");
    }
  } catch (error) {
    log("❌ Transfer error: " + error.message, "error");
  }
}

async function viewHistory() {
  log("📜 Fetching transaction history...", "info");

  try {
    const timestamp = Date.now();
    const payload = {
      username: state.username,
      timestamp,
      token: state.token,
    };

    // Sign ORIGINAL payload (before padding)
    const signature = signData(payload, state.keyPair);

    // Apply padding AFTER signing (4KB target)
    const paddedPayload = applyPadding(payload);

    // Format request for Gateway
    const requestBody = {
      protected_payload: paddedPayload,
      user_signature: signature,
      meta: {},
    };

    log("📤 Request Body (POST /api/history):", "info", requestBody);

    const response = await fetch(`${CONFIG.GATEWAY_URL}/api/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    log("📥 Response from server:", response.ok ? "success" : "error", result);

    if (response.ok) {
      showSecurityLayers([true, true, true]);

      if (result.transactions && result.transactions.length > 0) {
        log("✅ Transaction history retrieved", "success");
        result.transactions.forEach((tx, index) => {
          log(`📝 Transaction ${index + 1}:`, "info", tx);
        });
      } else {
        log("ℹ️ No transactions found", "info");
      }
    } else {
      log("❌ Failed to get history: " + result.error, "error");
    }
  } catch (error) {
    log("❌ History error: " + error.message, "error");
  }
}

function logout() {
  log("👋 Logging out...", "info");

  state.token = null;
  state.isLoggedIn = false;

  updateUI();
  showSecurityLayers([false, false, false]);

  log("✅ Logged out successfully", "success");

  // Show login section again
  document.getElementById("loginSection").style.display = "block";
}

function registerNewUser() {
  log("🔄 Switching to register new user...", "info");

  // Clear current user data
  state.username = null;
  state.keyPair = null;
  state.token = null;
  state.isLoggedIn = false;

  // Clear localStorage
  localStorage.removeItem("zerotrust_keys");

  // Update UI
  document.getElementById("registerSection").style.display = "block";
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("actionsSection").style.display = "none";
  document.getElementById("userInfo").style.display = "none";
  document.getElementById("balanceDisplay").style.display = "none";
  document.getElementById("securityLayers").style.display = "none";

  // Clear input
  document.getElementById("registerUsername").value = "";

  log("✅ Ready to register new user", "success");
}

// ============= Demo Functions =============
async function simulateTokenTheft() {
  if (!state.token) {
    log("❌ No token to steal. Please login first.", "error");
    return;
  }

  log("⚠️ DEMO: Simulating token theft attack...", "warning");
  log("🔓 Attacker steals JWT token from network traffic", "warning", {
    "Stolen Token": state.token.substring(0, 50) + "...",
  });

  log(
    "👹 Attacker attempts to use stolen token without signature...",
    "warning"
  );

  try {
    const requestBody = {
      username: state.username,
      timestamp: Date.now(),
      // NO SIGNATURE!
    };

    log(
      "📤 Malicious Request Body (missing signature):",
      "warning",
      requestBody
    );

    const response = await fetch(`${CONFIG.GATEWAY_URL}/api/balance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`, // Valid token
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    log("📥 Response from server:", !response.ok ? "success" : "error", result);

    if (!response.ok) {
      log(
        "✅ ATTACK BLOCKED! 3-layer verification prevented unauthorized access",
        "success"
      );

      showSecurityLayers([true, true, false]); // Token OK, but no signature
    } else {
      log("❌ Security breach! This should not happen!", "error");
    }
  } catch (error) {
    log("✅ Attack failed: " + error.message, "success");
  }
}

async function simulateMITM() {
  if (!state.token) {
    log("❌ Please login first.", "error");
    return;
  }

  log("⚠️ DEMO: Simulating Man-in-the-Middle (MITM) attack...", "warning");
  log(
    "🕵️ Attacker intercepts request and modifies the recipient...",
    "warning"
  );

  try {
    // Create legitimate request
    const originalRecipient = "user2";
    const maliciousRecipient = "attacker";
    const amount = 100000;

    const payload = {
      data: {
        username: state.username,
        recipient: originalRecipient,
        amount: amount,
        timestamp: Date.now(),
      },
      token: state.token,
    };

    // Sign ORIGINAL payload (before padding and tampering)
    const signature = signData(payload, state.keyPair);
    const paddedPayload = applyPadding(payload);

    log("📤 Original Request (before interception):", "info", {
      recipient: originalRecipient,
      amount: amount,
    });

    // Attacker modifies the payload AFTER signing
    const tamperedPayload = JSON.parse(JSON.stringify(payload));
    tamperedPayload.data.recipient = maliciousRecipient;
    const tamperedPadded = applyPadding(tamperedPayload);

    log("👹 Attacker modifies recipient:", "warning", {
      original: originalRecipient,
      tampered: maliciousRecipient,
    });

    const requestBody = {
      protected_payload: tamperedPadded,
      user_signature: signature, // Original signature doesn't match tampered data
      meta: {},
    };

    log("📤 Tampered Request (with original signature):", "warning", {
      tamperedRecipient: maliciousRecipient,
      originalSignature: signature.substring(0, 50) + "...",
    });

    const response = await fetch(`${CONFIG.GATEWAY_URL}/api/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    log("📥 Response from server:", !response.ok ? "success" : "error", result);

    if (!response.ok) {
      log(
        "✅ ATTACK BLOCKED! Signature verification detected data tampering",
        "success"
      );
      showSecurityLayers([true, true, false]); // Signature failed
    } else {
      log("❌ Security breach! This should not happen!", "error");
    }
  } catch (error) {
    log("✅ Attack failed: " + error.message, "success");
  }
}

async function simulateReplayAttack() {
  if (!state.token) {
    log("❌ Please login first.", "error");
    return;
  }

  log("⚠️ DEMO: Simulating Replay Attack...", "warning");
  log("🔁 Attacker captures old request and tries to replay it...", "warning");

  try {
    // Create request with old timestamp (5 minutes ago)
    const oldTimestamp = Date.now() - 5 * 60 * 1000;

    const payload = {
      data: {
        username: state.username,
        timestamp: oldTimestamp,
      },
      token: state.token,
    };

    // Sign payload then pad
    const signature = signData(payload, state.keyPair);
    const paddedPayload = applyPadding(payload);

    const requestBody = {
      protected_payload: paddedPayload,
      user_signature: signature,
      meta: {},
    };

    log("📤 Replayed Request (old timestamp):", "warning", {
      timestamp: new Date(oldTimestamp).toISOString(),
      ageMinutes: 5,
    });

    const response = await fetch(`${CONFIG.GATEWAY_URL}/api/balance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    log("📥 Response from server:", !response.ok ? "success" : "error", result);

    if (!response.ok) {
      log(
        "✅ ATTACK BLOCKED! Timestamp validation prevented replay attack",
        "success"
      );
      showSecurityLayers([true, false, false]); // HMAC/timestamp failed
    } else {
      log("❌ Security breach! This should not happen!", "error");
    }
  } catch (error) {
    log("✅ Attack failed: " + error.message, "success");
  }
}

async function simulateDataTampering() {
  if (!state.token) {
    log("❌ Please login first.", "error");
    return;
  }

  log("⚠️ DEMO: Simulating Data Tampering Attack...", "warning");
  log(
    "✏️ Attacker tries to modify transfer amount after signing...",
    "warning"
  );

  try {
    // Create legitimate request
    const originalAmount = 10000;
    const tamperedAmount = 1000000;

    const payload = {
      data: {
        username: state.username,
        recipient: "user2",
        amount: originalAmount,
        timestamp: Date.now(),
      },
      token: state.token,
    };

    // Sign ORIGINAL payload (before padding and tampering)
    const signature = signData(payload, state.keyPair);
    const paddedPayload = applyPadding(payload);

    log("📤 Original Request (signed):", "info", {
      amount: originalAmount,
      amountFormatted: originalAmount.toLocaleString("vi-VN") + " VND",
    });

    // Attacker modifies the amount AFTER signing
    const tamperedPayload = JSON.parse(JSON.stringify(payload));
    tamperedPayload.data.amount = tamperedAmount;
    const tamperedPadded = applyPadding(tamperedPayload);

    log("👹 Attacker modifies amount:", "warning", {
      original: originalAmount.toLocaleString("vi-VN") + " VND",
      tampered: tamperedAmount.toLocaleString("vi-VN") + " VND",
    });

    const requestBody = {
      protected_payload: tamperedPadded,
      user_signature: signature, // Original signature doesn't match tampered data
      meta: {},
    };

    log("📤 Tampered Request:", "warning", {
      tamperedAmount: tamperedAmount.toLocaleString("vi-VN") + " VND",
      originalSignature: signature.substring(0, 50) + "...",
    });

    const response = await fetch(`${CONFIG.GATEWAY_URL}/api/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    log("📥 Response from server:", !response.ok ? "success" : "error", result);

    if (!response.ok) {
      log(
        "✅ ATTACK BLOCKED! Signature verification detected amount tampering",
        "success"
      );
      showSecurityLayers([true, true, false]); // Signature failed
    } else {
      log("❌ Security breach! This should not happen!", "error");
    }
  } catch (error) {
    log("✅ Attack failed: " + error.message, "success");
  }
}
