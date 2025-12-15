const axios = require("axios");
const crypto = require("../shared/crypto");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:4002";
const STORAGE_DIR = path.join(__dirname, ".storage");
const KEYS_FILE = path.join(STORAGE_DIR, "keys.json");

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Client state
let clientState = {
  privateKey: null,
  publicKey: null,
  username: null,
  token: null,
};

/**
 * Create readline interface
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompt user for input
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Save keys to file
 */
function saveKeys() {
  try {
    const keysData = {
      username: clientState.username,
      privateKey: clientState.privateKey,
      publicKey: clientState.publicKey,
    };
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keysData, null, 2));
    console.log("✅ Keys saved to:", KEYS_FILE);
  } catch (error) {
    console.error("❌ Failed to save keys:", error.message);
  }
}

/**
 * Load keys from file
 */
function loadKeys() {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const keysData = JSON.parse(fs.readFileSync(KEYS_FILE, "utf8"));
      clientState.username = keysData.username;
      clientState.privateKey = keysData.privateKey;
      clientState.publicKey = keysData.publicKey;
      console.log("✅ Keys loaded for user:", clientState.username);
      return true;
    }
  } catch (error) {
    console.error("❌ Failed to load keys:", error.message);
  }
  return false;
}

/**
 * Register new user
 */
async function register() {
  try {
    console.log("\n📝 === USER REGISTRATION ===");

    const username = await prompt("Enter username: ");

    if (!username) {
      console.log("❌ Username is required");
      return;
    }

    // Generate ECDSA keypair
    console.log("🔑 Generating ECDSA keypair...");
    const keyPair = crypto.generateECDSAKeyPair();

    clientState.username = username;
    clientState.privateKey = keyPair.privateKey;
    clientState.publicKey = keyPair.publicKey;

    console.log("✅ Keypair generated");
    console.log("   Public Key:", keyPair.publicKey.substring(0, 40) + "...");

    // Register with AAA Server via Gateway
    console.log("📤 Registering with server...");

    const response = await axios.post(`${GATEWAY_URL}/register`, {
      username: username,
      publicKey: keyPair.publicKey,
    });

    if (response.data.success) {
      console.log("✅ Registration successful!");
      console.log("   User ID:", response.data.user.id);

      // Save keys
      saveKeys();

      console.log("\n⚠️  IMPORTANT: Your private key has been saved locally.");
      console.log("   Keep it safe! It cannot be recovered if lost.");
    } else {
      console.log("❌ Registration failed:", response.data.error);
    }
  } catch (error) {
    if (error.response) {
      console.error(
        "❌ Registration failed:",
        error.response.data.error || error.message
      );
    } else {
      console.error("❌ Network error:", error.message);
    }
  }
}

/**
 * Login user
 */
async function login() {
  try {
    console.log("\n🔐 === USER LOGIN ===");

    if (!clientState.privateKey) {
      console.log(
        "❌ No keys found. Please register first or load existing keys."
      );
      return;
    }

    console.log("Username:", clientState.username);

    // Create login request
    const timestamp = Math.floor(Date.now() / 1000);
    const loginData = {
      username: clientState.username,
      timestamp: timestamp,
    };

    // Sign with private key
    console.log("✍️  Signing login request with ECDSA...");
    const signature = crypto.signWithPrivateKey(
      loginData,
      clientState.privateKey
    );

    // Send to server
    console.log("📤 Sending login request...");

    const response = await axios.post(`${GATEWAY_URL}/login`, {
      username: clientState.username,
      timestamp: timestamp,
      signature: signature,
    });

    if (response.data.success) {
      clientState.token = response.data.token;
      console.log("✅ Login successful!");
      console.log("   Token:", clientState.token.substring(0, 50) + "...");
    } else {
      console.log("❌ Login failed:", response.data.error);
    }
  } catch (error) {
    if (error.response) {
      console.error(
        "❌ Login failed:",
        error.response.data.error || error.message
      );
    } else {
      console.error("❌ Network error:", error.message);
    }
  }
}

/**
 * Check balance
 */
async function checkBalance() {
  try {
    console.log("\n💰 === CHECK BALANCE ===");

    if (!clientState.token) {
      console.log("❌ Not logged in. Please login first.");
      return;
    }

    // Create request payload
    const requestData = {
      token: clientState.token,
      data: {
        action: "balance",
        timestamp: Math.floor(Date.now() / 1000),
      },
    };

    // Apply padding
    console.log("🔒 Applying padding (target: 4KB)...");
    const paddedPayload = crypto.applyPadding(requestData);

    // Sign the entire payload
    console.log("✍️  Signing request with ECDSA...");
    const signature = crypto.signWithPrivateKey(
      paddedPayload,
      clientState.privateKey
    );

    // Create full request
    const fullRequest = {
      meta: {
        timestamp: Math.floor(Date.now() / 1000),
        version: "1.0",
      },
      protected_payload: paddedPayload,
      user_signature: signature,
    };

    // Send to Gateway
    console.log("📤 Sending request to Gateway...");

    const response = await axios.post(
      `${GATEWAY_URL}/api/balance`,
      fullRequest
    );

    if (response.data.success) {
      console.log("✅ Balance retrieved!");
      console.log("   Username:", response.data.data.username);
      console.log(
        "   Balance:",
        response.data.data.balance.toLocaleString(),
        response.data.data.currency
      );
      console.log("\n🔐 Verification Layers:");
      console.log(
        "   ✅ Gateway HMAC:",
        response.data.verification_layers.gateway_hmac
      );
      console.log("   ✅ Token:", response.data.verification_layers.token);
      console.log(
        "   ✅ User Signature:",
        response.data.verification_layers.user_signature
      );
    } else {
      console.log("❌ Request failed:", response.data.error);
    }
  } catch (error) {
    if (error.response) {
      console.error(
        "❌ Request failed:",
        error.response.data.error || error.message
      );
      if (error.response.data.layer) {
        console.error("   Failed at layer:", error.response.data.layer);
      }
    } else {
      console.error("❌ Network error:", error.message);
    }
  }
}

/**
 * Transfer money
 */
async function transfer() {
  try {
    console.log("\n💸 === TRANSFER MONEY ===");

    if (!clientState.token) {
      console.log("❌ Not logged in. Please login first.");
      return;
    }

    const receiver = await prompt("Enter receiver username: ");
    const amount = parseInt(await prompt("Enter amount: "));

    if (!receiver || !amount || amount <= 0) {
      console.log("❌ Invalid input");
      return;
    }

    // Create request payload
    const requestData = {
      token: clientState.token,
      data: {
        action: "transfer",
        receiver: receiver,
        amount: amount,
        timestamp: Math.floor(Date.now() / 1000),
      },
    };

    // Apply padding
    console.log("🔒 Applying padding (target: 4KB)...");
    const paddedPayload = crypto.applyPadding(requestData);

    // Sign the entire payload
    console.log("✍️  Signing request with ECDSA...");
    const signature = crypto.signWithPrivateKey(
      paddedPayload,
      clientState.privateKey
    );

    // Create full request
    const fullRequest = {
      meta: {
        timestamp: Math.floor(Date.now() / 1000),
        version: "1.0",
      },
      protected_payload: paddedPayload,
      user_signature: signature,
    };

    // Send to Gateway
    console.log("📤 Sending transfer request...");

    const response = await axios.post(
      `${GATEWAY_URL}/api/transfer`,
      fullRequest
    );

    if (response.data.success) {
      console.log("✅ Transfer completed!");
      console.log("   Transaction ID:", response.data.data.transaction.id);
      console.log("   From:", response.data.data.transaction.from);
      console.log("   To:", response.data.data.transaction.to);
      console.log(
        "   Amount:",
        response.data.data.transaction.amount.toLocaleString(),
        "VND"
      );
      console.log(
        "   New Balance:",
        response.data.data.new_balance.toLocaleString(),
        "VND"
      );
    } else {
      console.log("❌ Transfer failed:", response.data.error);
    }
  } catch (error) {
    if (error.response) {
      console.error(
        "❌ Transfer failed:",
        error.response.data.error || error.message
      );
    } else {
      console.error("❌ Network error:", error.message);
    }
  }
}

/**
 * View transaction history
 */
async function viewHistory() {
  try {
    console.log("\n📜 === TRANSACTION HISTORY ===");

    if (!clientState.token) {
      console.log("❌ Not logged in. Please login first.");
      return;
    }

    // Create request payload
    const requestData = {
      token: clientState.token,
      data: {
        action: "history",
        timestamp: Math.floor(Date.now() / 1000),
      },
    };

    // Apply padding
    const paddedPayload = crypto.applyPadding(requestData);

    // Sign
    const signature = crypto.signWithPrivateKey(
      paddedPayload,
      clientState.privateKey
    );

    // Create full request
    const fullRequest = {
      meta: {
        timestamp: Math.floor(Date.now() / 1000),
        version: "1.0",
      },
      protected_payload: paddedPayload,
      user_signature: signature,
    };

    // Send to Gateway
    const response = await axios.post(
      `${GATEWAY_URL}/api/history`,
      fullRequest
    );

    if (response.data.success) {
      const transactions = response.data.data.transactions;
      console.log(`✅ Found ${transactions.length} transactions:\n`);

      if (transactions.length === 0) {
        console.log("   No transactions yet.");
      } else {
        transactions.forEach((tx) => {
          console.log(
            `   [${tx.id}] ${tx.from} → ${
              tx.to
            }: ${tx.amount.toLocaleString()} VND`
          );
          console.log(`       ${tx.timestamp} (${tx.status})`);
        });
      }
    } else {
      console.log("❌ Request failed:", response.data.error);
    }
  } catch (error) {
    if (error.response) {
      console.error(
        "❌ Request failed:",
        error.response.data.error || error.message
      );
    } else {
      console.error("❌ Network error:", error.message);
    }
  }
}

/**
 * Main menu
 */
async function mainMenu() {
  console.log("\n" + "=".repeat(50));
  console.log("🔐 ZERO TRUST CLIENT - DEMO");
  console.log("=".repeat(50));
  console.log("1. Register new user");
  console.log("2. Login");
  console.log("3. Check balance");
  console.log("4. Transfer money");
  console.log("5. View transaction history");
  console.log("6. Load existing keys");
  console.log("7. Show current state");
  console.log("0. Exit");
  console.log("=".repeat(50));

  const choice = await prompt("Enter your choice: ");

  switch (choice) {
    case "1":
      await register();
      break;
    case "2":
      await login();
      break;
    case "3":
      await checkBalance();
      break;
    case "4":
      await transfer();
      break;
    case "5":
      await viewHistory();
      break;
    case "6":
      loadKeys();
      break;
    case "7":
      console.log("\n📊 Current State:");
      console.log("   Username:", clientState.username || "Not set");
      console.log("   Has Private Key:", !!clientState.privateKey);
      console.log("   Has Public Key:", !!clientState.publicKey);
      console.log("   Logged In:", !!clientState.token);
      if (clientState.publicKey) {
        console.log(
          "   Public Key:",
          clientState.publicKey.substring(0, 40) + "..."
        );
      }
      break;
    case "0":
      console.log("\n👋 Goodbye!");
      rl.close();
      process.exit(0);
      break;
    default:
      console.log("❌ Invalid choice");
  }

  // Return to menu
  await mainMenu();
}

/**
 * Start the client
 */
async function start() {
  console.log("\n🚀 Starting Zero Trust Client...");
  console.log("   Gateway URL:", GATEWAY_URL);

  // Try to load existing keys
  const hasKeys = loadKeys();

  if (hasKeys) {
    console.log("✅ Found existing keys. You can login directly.");
  } else {
    console.log("⚠️  No existing keys found. Please register first.");
  }

  await mainMenu();
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down...");
  rl.close();
  process.exit(0);
});

// Start the client
start().catch((error) => {
  console.error("❌ Fatal error:", error.message);
  process.exit(1);
});
