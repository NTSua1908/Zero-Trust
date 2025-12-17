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
  if (typeof nacl === "undefined" || typeof CryptoJS === "undefined") {
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
    detailsHtml = `<div style="margin-top: 2px; padding: 4px; background: rgba(0,0,0,0.05); border-radius: 4px; font-size: 11px; display: block;">${formatDetails(
      details
    )}</div>`;
  }

  logEntry.innerHTML = `<div class="timestamp">[${timestamp}]</div><div class="message">${message.trim()}</div>${detailsHtml}`;

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
  log("🔑 Generating Ed25519 key pair (Curve25519)...", "info");

  // Using TweetNaCl for Ed25519 (same as backend)
  const keyPair = nacl.sign.keyPair();

  // Convert to hex for storage and transmission
  const publicKey = Array.from(keyPair.publicKey)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const privateKey = Array.from(keyPair.secretKey)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  log("✅ Key pair generated successfully", "success", {
    "Public Key": publicKey.substring(0, 64) + "...",
    "Private Key": "[PROTECTED]",
    Algorithm: "Ed25519 (Curve25519)",
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
  // Convert data to UTF-8 bytes (same as backend: JSON.stringify)
  const dataString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const message = encoder.encode(dataString);

  // Convert hex private key to Uint8Array (handle both stored string and generated keyPair)
  let secretKey;
  if (keyPair.keyPairObject && keyPair.keyPairObject.secretKey) {
    // Use existing Uint8Array from generated keypair
    secretKey = keyPair.keyPairObject.secretKey;
  } else {
    // Convert from hex string (loaded from storage)
    secretKey = new Uint8Array(
      keyPair.privateKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );
  }

  // Sign with Ed25519
  const signature = nacl.sign.detached(message, secretKey);

  // Convert signature to hex
  const signatureHex = Array.from(signature)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

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
  // Get existing accounts
  let accounts = JSON.parse(localStorage.getItem("zerotrust_accounts") || "{}");

  // Save this account
  accounts[username] = {
    username,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };

  localStorage.setItem("zerotrust_accounts", JSON.stringify(accounts));
  localStorage.setItem("zerotrust_last_username", username);
  log("💾 Account saved to browser storage", "success");
}

function getAllAccounts() {
  return JSON.parse(localStorage.getItem("zerotrust_accounts") || "{}");
}

function getLastUsername() {
  return localStorage.getItem("zerotrust_last_username");
}

function deleteAccount(username) {
  let accounts = getAllAccounts();
  delete accounts[username];
  localStorage.setItem("zerotrust_accounts", JSON.stringify(accounts));
  log("🗑️ Account deleted: " + username, "info");
}

async function loadStoredKeys() {
  // Migration: convert old single account to new format
  const oldStored = localStorage.getItem("zerotrust_keys");
  if (oldStored) {
    const data = JSON.parse(oldStored);
    saveKeys(data.username, data);
    localStorage.removeItem("zerotrust_keys");
  }

  const accounts = getAllAccounts();
  const lastUsername = getLastUsername();

  if (Object.keys(accounts).length > 0) {
    // Has saved accounts - show account selection
    document.getElementById("accountSelectionSection").style.display = "block";
    document.getElementById("registerSection").style.display = "none";
    document.getElementById("loginSection").style.display = "none";

    // Render account list
    renderAccountList();

    log(`📂 Found ${Object.keys(accounts).length} saved account(s)`, "info");
    if (lastUsername) {
      log(`💡 Last used: ${lastUsername}`, "info");
    }
  } else {
    // No saved accounts - show account selection
    document.getElementById("accountSelectionSection").style.display = "block";
    document.getElementById("registerSection").style.display = "none";
    document.getElementById("loginSection").style.display = "none";
    log(
      "💡 Welcome! Please register a new account or login with existing credentials",
      "info"
    );
  }
}

function renderAccountList() {
  const accounts = getAllAccounts();
  const lastUsername = getLastUsername();
  const container = document.getElementById("savedAccountsList");

  if (!container) return;

  if (Object.keys(accounts).length === 0) {
    container.innerHTML =
      '<p style="color: #999; font-size: 13px; text-align: center; padding: 20px;">No saved accounts</p>';
    return;
  }

  container.innerHTML = Object.keys(accounts)
    .map((username) => {
      const account = accounts[username];
      const isLast = username === lastUsername;
      return `
      <div class="account-item ${
        isLast ? "last-used" : ""
      }" onclick="selectAccount('${username}')">
        <div class="account-info">
          <div class="account-username">👤 ${username}</div>
          <div class="account-key">${account.publicKey.substring(
            0,
            20
          )}...</div>
        </div>
        <div class="account-actions">
          ${isLast ? '<span class="badge">Last Used</span>' : ""}
          <button class="btn-icon" onclick="event.stopPropagation(); deleteAccountConfirm('${username}')" title="Delete">🗑️</button>
        </div>
      </div>
    `;
    })
    .join("");
}

// ============= UI Updates =============
function updateUI() {
  if (state.isLoggedIn) {
    document.getElementById("userInfo").style.display = "block";
    document.getElementById("accountSelectionSection").style.display = "none";
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
      log("🔑 Auto-logging in with new account...", "info");

      // Auto login after registration
      await login();
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

  const username = state.username;
  state.token = null;
  state.isLoggedIn = false;

  updateUI();
  showSecurityLayers([false, false, false]);

  log(`✅ Logged out from account: ${username}`, "success");
  log("💡 You can login again or switch to a different account", "info");

  // Show account selection with account list
  document.getElementById("accountSelectionSection").style.display = "block";
  document.getElementById("registerSection").style.display = "none";
  document.getElementById("loginSection").style.display = "none";

  // Refresh account list
  renderAccountList();
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
  document.getElementById("accountSelectionSection").style.display = "none";
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

// ============= Account Switching Functions =============

function showRegisterForm() {
  try {
    log("➕ Opening registration form...", "info");
    document.getElementById("accountSelectionSection").style.display = "none";
    document.getElementById("registerSection").style.display = "block";
    document.getElementById("loginSection").style.display = "none";

    // Focus on username input
    setTimeout(() => {
      const input = document.getElementById("registerUsername");
      if (input) {
        input.focus();
      }
    }, 100);
  } catch (error) {
    console.error("Error in showRegisterForm:", error);
    log("❌ Error showing register form: " + error.message, "error");
  }
}

function showLoginForm() {
  try {
    log("🔑 Opening login form...", "info");
    document.getElementById("accountSelectionSection").style.display = "none";
    document.getElementById("registerSection").style.display = "none";
    document.getElementById("loginSection").style.display = "block";

    // Check if we have saved account
    const stored = localStorage.getItem("zerotrust_keys");
    if (stored) {
      const data = JSON.parse(stored);
      document.getElementById("savedAccountLogin").style.display = "block";
      document.getElementById("manualAccountLogin").style.display = "none";
      document.getElementById("savedAccountInfo").textContent = `Username: ${
        data.username
      } | Public Key: ${data.publicKey.substring(0, 16)}...`;
      log("✓ Found saved account: " + data.username, "success");
    } else {
      // No saved account, show manual login form
      showManualLoginForm();
    }
  } catch (error) {
    console.error("Error in showLoginForm:", error);
    log("❌ Error showing login form: " + error.message, "error");
  }
}

function showManualLoginForm() {
  log("🔄 Switching to manual login...", "info");
  document.getElementById("savedAccountLogin").style.display = "none";
  document.getElementById("manualAccountLogin").style.display = "block";

  // Focus on username input
  setTimeout(() => {
    const input = document.getElementById("manualUsername");
    if (input) {
      input.focus();
    }
  }, 100);
}

function backToAccountSelection() {
  log("← Returning to account selection...", "info");
  document.getElementById("accountSelectionSection").style.display = "block";
  document.getElementById("registerSection").style.display = "none";
  document.getElementById("loginSection").style.display = "none";

  // Clear input fields
  document.getElementById("registerUsername").value = "";
  document.getElementById("manualUsername").value = "";
  document.getElementById("manualPrivateKey").value = "";

  // Refresh account list
  renderAccountList();
}

function switchAccount() {
  try {
    log("🔄 Switching to different account...", "info");

    // Clear current session
    const wasLoggedIn = state.isLoggedIn;
    state.token = null;
    state.isLoggedIn = false;

    // Keep keys in storage for later use, but clear from state
    const username = state.username;
    state.username = null;
    state.keyPair = null;

    // Show account selection
    document.getElementById("accountSelectionSection").style.display = "block";
    document.getElementById("registerSection").style.display = "none";
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("actionsSection").style.display = "none";
    document.getElementById("userInfo").style.display = "none";
    document.getElementById("balanceDisplay").style.display = "none";
    document.getElementById("securityLayers").style.display = "none";

    // Reset security layers
    showSecurityLayers([false, false, false]);

    // Refresh account list
    renderAccountList();

    if (wasLoggedIn) {
      log(`✅ Logged out from account: ${username}`, "success");
    }
    log("✅ Ready to login or register with different account", "success");
  } catch (error) {
    log("❌ Error switching account: " + error.message, "error");
  }
}

function selectAccount(username) {
  try {
    log(`🔑 Loading account: ${username}...`, "info");

    const accounts = getAllAccounts();
    const account = accounts[username];

    if (!account) {
      log("❌ Account not found", "error");
      return;
    }

    // Load keys into state
    state.username = account.username;
    state.keyPair = {
      publicKey: account.publicKey,
      privateKey: account.privateKey,
    };

    // Recreate Ed25519 key pair from stored hex keys
    const secretKey = new Uint8Array(
      account.privateKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );
    const publicKey = new Uint8Array(
      account.publicKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );
    state.keyPair.keyPairObject = {
      secretKey: secretKey,
      publicKey: publicKey,
    };

    // Save as last used
    localStorage.setItem("zerotrust_last_username", username);

    log("✅ Account loaded successfully", "success");

    // Auto login
    login();
  } catch (error) {
    log("❌ Error loading account: " + error.message, "error");
    console.error(error);
  }
}

function deleteAccountConfirm(username) {
  if (
    confirm(
      `Are you sure you want to delete account "${username}"?\n\nThis will permanently remove the private key from browser storage.`
    )
  ) {
    deleteAccount(username);
    renderAccountList();

    // If it was the current account, reset
    if (state.username === username) {
      state.username = null;
      state.keyPair = null;
      state.token = null;
      state.isLoggedIn = false;
      updateUI();
    }
  }
}

async function loginWithManualKeys() {
  const username = document.getElementById("manualUsername").value.trim();
  const privateKey = document.getElementById("manualPrivateKey").value.trim();

  if (!username || !privateKey) {
    log("❌ Please enter both username and private key", "error");
    return;
  }

  log("🔑 Attempting manual login...", "info", { Username: username });

  try {
    // Validate and recreate Ed25519 key pair
    const secretKey = new Uint8Array(
      privateKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );

    // Ed25519 secret key is 64 bytes (private 32 + public 32)
    if (secretKey.length !== 64) {
      throw new Error("Invalid Ed25519 private key length (expected 64 bytes)");
    }

    // Extract public key from secret key (last 32 bytes)
    const publicKeyBytes = secretKey.slice(32);
    const publicKey = Array.from(publicKeyBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const keyPair = {
      secretKey: secretKey,
      publicKey: publicKeyBytes,
    };

    // Set state
    state.username = username;
    state.keyPair = {
      publicKey: publicKey,
      privateKey: privateKey,
      keyPairObject: keyPair,
    };

    // Save to storage
    saveKeys(username, state.keyPair);

    log("✅ Keys loaded successfully", "success");
    log("🔐 Public Key: " + publicKey.substring(0, 32) + "...", "info");

    // Update UI
    updateUI();
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("savedAccountLogin").style.display = "block";
    document.getElementById("manualAccountLogin").style.display = "none";
    document.getElementById(
      "savedAccountInfo"
    ).textContent = `Username: ${username} | Public Key: ${publicKey.substring(
      0,
      16
    )}...`;

    // Now proceed with actual login
    await login();
  } catch (error) {
    log("❌ Invalid private key: " + error.message, "error");
  }
}

function loginDifferentAccount() {
  // Legacy function - redirect to switchAccount
  switchAccount();
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

  log("⚠️ DEMO: Simulating Gateway Impersonation (MITM) attack...", "warning");
  log("🕵️ Attacker intercepts and tries to impersonate gateway...", "warning");

  try {
    log("\n=== LEGITIMATE REQUEST ===", "info");

    // Step 1: Create and send legitimate balance request
    const payload = {
      data: {
        action: "balance",
        timestamp: Math.floor(Date.now() / 1000),
      },
      token: state.token,
    };

    const signature = signData(payload, state.keyPair);
    const paddedPayload = applyPadding(payload);

    log("📤 Client sends balance request:", "info", {
      action: "balance",
      signed: "with user private key",
    });

    // Step 2: Simulate attacker intercepting and forging gateway response
    log("\n=== ATTACKER INTERCEPTS ===", "warning");
    log("🕵️ Attacker on network path between client and app", "warning");
    log("👹 Attacker creates fake gateway response...", "warning");

    // Attacker forges a response
    const fakeResponse = {
      success: true,
      data: {
        balance: 999999999,
        currency: "VND",
        message: "Balance after hacker attack!",
      },
    };

    log("👹 Forged gateway response:", "warning", {
      success: true,
      balance: 999999999,
      message: "Balance after hacker attack!",
    });

    // Step 3: Attacker tries to compute HMAC
    log("\n=== HMAC VALIDATION ===", "info");

    // Attacker doesn't have the real secret, tries to guess
    const wrongSecret = "attacker-fake-secret-2025";
    const attackerHMAC = CryptoJS.HmacSHA256(
      JSON.stringify(fakeResponse),
      wrongSecret
    ).toString();

    const correctSecret = "gateway-app-shared-secret-2025";
    const legitimateHMAC = CryptoJS.HmacSHA256(
      JSON.stringify(fakeResponse),
      correctSecret
    ).toString();

    log("👹 Attacker has:", "error", {
      "HMAC Secret": "❌ Does not have real secret",
      "Attacker guess": wrongSecret,
      "Computed HMAC": attackerHMAC.substring(0, 40) + "...",
    });

    log("🔐 Real HMAC (only legitimate gateway knows):", "success", {
      "Real Secret": "[PROTECTED]",
      "Real HMAC": legitimateHMAC.substring(0, 40) + "...",
    });

    // Step 4: Client validates HMAC
    log("\n=== CLIENT VALIDATES RESPONSE ===", "info");

    // Client would use the real secret to compute HMAC
    const clientComputedHMAC = CryptoJS.HmacSHA256(
      JSON.stringify(fakeResponse),
      correctSecret
    ).toString();

    log("🔍 Client checks: Received HMAC === Computed HMAC", "info", {
      "Received HMAC": attackerHMAC.substring(0, 40) + "... (from attacker)",
      "Computed HMAC":
        clientComputedHMAC.substring(0, 40) + "... (real gateway)",
      match: attackerHMAC === clientComputedHMAC,
    });

    // Show that Layer 1 (HMAC/Gateway validation) failed
    showSecurityLayers([false, true, true]); // HMAC FAILED, Token OK, Signature OK

    log("\n*** ATTACK BLOCKED! ***", "success");
    log("✅ HMAC validation FAILED!", "success");
    log("✅ Fake response rejected - not from legitimate gateway", "success");
    log("✅ Attack cannot proceed because:", "info", {
      reason1: "Attacker does NOT have GATEWAY_HMAC_SECRET",
      reason2: "Cannot compute valid HMAC without the secret",
      reason3: "Forged response is detected and rejected",
    });

    log("\n=== SECURITY EXPLANATION ===", "info");
    log(
      "🔑 Asymmetric Signatures: Prove CLIENT is legitimate (User Private Key)",
      "info"
    );
    log("🔐 HMAC: Prove GATEWAY is legitimate (Shared Gateway Secret)", "info");
    log(
      "✓ Together they create zero-trust security - cryptographically verify all communication",
      "success"
    );
  } catch (error) {
    log("❌ Demo error: " + error.message, "error");
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
      showSecurityLayers([false, false, false]); // All layers fail due to old timestamp
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
