const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("../shared/crypto");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 4003;
const AAA_URL = process.env.AAA_URL || "http://localhost:4001";
const GATEWAY_HMAC_SECRET =
  process.env.GATEWAY_HMAC_SECRET || "gateway-app-shared-secret-2025";

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "zerotrust",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// In-memory transactions (for demo)
const transactions = [];

/**
 * Health check
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "App Service",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Middleware: Verify Gateway HMAC (Layer 1 - Gateway Authentication)
 */
function verifyGatewayHMAC(req, res, next) {
  try {
    const { gateway_envelope, gateway_hmac } = req.body;

    if (!gateway_envelope || !gateway_hmac) {
      console.error("❌ Missing gateway envelope or HMAC");
      return res.status(400).json({
        success: false,
        error: "Invalid request structure",
        layer: "gateway_verification",
      });
    }

    // Verify HMAC
    const isValid = crypto.verifyHMAC(
      gateway_envelope,
      gateway_hmac,
      GATEWAY_HMAC_SECRET
    );

    if (!isValid) {
      console.error("❌ HMAC verification failed - Untrusted gateway");
      return res.status(401).json({
        success: false,
        error: "Gateway authentication failed",
        layer: "gateway_verification",
      });
    }

    console.log("✅ Layer 1: Gateway HMAC verified");
    req.gatewayEnvelope = gateway_envelope;
    next();
  } catch (error) {
    console.error("❌ HMAC verification error:", error.message);
    res.status(500).json({
      success: false,
      error: "Gateway verification failed",
      layer: "gateway_verification",
    });
  }
}

/**
 * Middleware: Verify Token (Layer 2 - Authorization)
 */
async function verifyToken(req, res, next) {
  try {
    const { protected_payload } = req.gatewayEnvelope.original_request;

    // Remove padding to get actual payload
    const actualPayload = crypto.removePadding(protected_payload);

    if (!actualPayload || !actualPayload.token) {
      console.error("❌ Missing token");
      return res.status(400).json({
        success: false,
        error: "Token required",
        layer: "token_verification",
      });
    }

    // REPLAY ATTACK PROTECTION: Validate timestamp
    // Check both direct timestamp and nested data.timestamp
    const timestamp = actualPayload.timestamp || actualPayload.data?.timestamp;

    if (timestamp) {
      const now = Date.now();
      const requestTime = timestamp;
      const timeDiff = Math.abs(now - requestTime);
      const MAX_TIME_DIFF = 60 * 1000; // 60 seconds (1 minute)

      if (timeDiff > MAX_TIME_DIFF) {
        console.error("❌ Replay attack detected - Timestamp too old:", {
          requestTime: new Date(requestTime).toISOString(),
          currentTime: new Date(now).toISOString(),
          diffSeconds: Math.floor(timeDiff / 1000),
          maxAllowedSeconds: 60,
        });
        return res.status(401).json({
          success: false,
          error: "Request timestamp expired - Possible replay attack",
          layer: "timestamp_validation",
          details: {
            age_seconds: Math.floor(timeDiff / 1000),
            max_allowed_seconds: 60,
          },
        });
      }
      console.log(
        "✅ Timestamp validation passed (age: " +
          Math.floor(timeDiff / 1000) +
          "s)"
      );
    } else {
      console.warn("⚠️ No timestamp in request - replay protection disabled");
    }

    // Verify token with AAA Server
    const response = await axios.post(`${AAA_URL}/verify-token`, {
      token: actualPayload.token,
    });

    if (!response.data.success) {
      console.error("❌ Token verification failed");
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
        layer: "token_verification",
      });
    }

    console.log("✅ Layer 2: Token verified");
    req.tokenPayload = response.data.payload;
    next();
  } catch (error) {
    console.error("❌ Token verification error:", error.message);
    res.status(401).json({
      success: false,
      error: "Token verification failed",
      layer: "token_verification",
    });
  }
}

/**
 * Middleware: Verify User Signature (Layer 3 - User Authentication)
 */
function verifyUserSignature(req, res, next) {
  try {
    const { protected_payload, user_signature } =
      req.gatewayEnvelope.original_request;
    const publicKey = req.tokenPayload.publicKey;

    if (!user_signature) {
      console.error("❌ Missing user signature");
      return res.status(400).json({
        success: false,
        error: "User signature required",
        layer: "user_signature_verification",
      });
    }

    // Remove padding before verification
    const originalPayload = crypto.removePadding(protected_payload);

    console.log("🔍 After removePadding:", {
      hasData: !!originalPayload,
      dataType: typeof originalPayload,
      dataKeys: originalPayload ? Object.keys(originalPayload) : [],
      dataPreview: originalPayload
        ? JSON.stringify(originalPayload).substring(0, 100)
        : "null",
    });

    console.log("🔍 Signature Debug:", {
      signatureType: typeof user_signature,
      signatureLength: user_signature ? user_signature.length : 0,
      signaturePreview: user_signature
        ? user_signature.substring(0, 50)
        : "null",
      publicKeyLength: publicKey ? publicKey.length : 0,
    });

    // Verify ECDSA signature
    const isValid = crypto.verifySignature(
      originalPayload,
      user_signature,
      publicKey
    );

    if (!isValid) {
      console.error("❌ User signature verification failed");
      return res.status(401).json({
        success: false,
        error: "Invalid user signature - Proof of possession failed",
        layer: "user_signature_verification",
      });
    }

    console.log("✅ Layer 3: User signature verified (Holder-of-Key proven)");
    req.userData = originalPayload;
    next();
  } catch (error) {
    console.error("❌ User signature verification error:", error.message);
    res.status(401).json({
      success: false,
      error: "User signature verification failed",
      layer: "user_signature_verification",
    });
  }
}

/**
 * Apply all three verification layers
 */
const threeLayerVerification = [
  verifyGatewayHMAC,
  verifyToken,
  verifyUserSignature,
];

/**
 * GET balance endpoint
 * POST /internal/balance
 */
app.post("/internal/balance", threeLayerVerification, async (req, res) => {
  try {
    const username = req.tokenPayload.username;

    console.log(`💰 Balance request for: ${username}`);

    // Get user account from database
    const userResult = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userId = userResult.rows[0].id;

    // Get account balance from database
    const accountResult = await pool.query(
      "SELECT balance, currency FROM accounts WHERE user_id = $1",
      [userId]
    );

    if (!accountResult.rows.length) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
      });
    }

    const account = accountResult.rows[0];

    res.json({
      success: true,
      data: {
        username: username,
        balance: parseInt(account.balance),
        currency: account.currency,
      },
      verification_layers: {
        gateway_hmac: "verified",
        token: "verified",
        user_signature: "verified",
      },
    });
  } catch (error) {
    console.error("❌ Balance query error:", error.message);
    res.status(500).json({
      success: false,
      error: "Balance query failed",
    });
  }
});

/**
 * Transfer money endpoint
 * POST /internal/transfer
 */
app.post("/internal/transfer", threeLayerVerification, async (req, res) => {
  try {
    const username = req.tokenPayload.username;

    console.log(`💸 Transfer request from: ${username}`);
    console.log("🔍 req.userData:", {
      exists: !!req.userData,
      type: typeof req.userData,
      keys: req.userData ? Object.keys(req.userData) : [],
      data: req.userData,
    });

    // Extract the actual data - userData already has the data after removePadding
    // The payload contains: { username, receiver, amount, timestamp, token }
    const receiver = req.userData?.receiver;
    const amount = req.userData?.amount;

    if (!receiver || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid transfer parameters",
        received: { receiver, amount, userData: req.userData },
      });
    }

    // Get sender user ID and account
    const senderResult = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (!senderResult.rows.length) {
      return res.status(400).json({
        success: false,
        error: "Sender not found",
      });
    }

    const senderId = senderResult.rows[0].id;

    // Get sender account balance
    const senderAccountResult = await pool.query(
      "SELECT balance, currency FROM accounts WHERE user_id = $1",
      [senderId]
    );

    if (!senderAccountResult.rows.length) {
      return res.status(400).json({
        success: false,
        error: "Sender account not found",
      });
    }

    const senderBalance = parseInt(senderAccountResult.rows[0].balance);

    // Check balance
    if (senderBalance < amount) {
      return res.status(400).json({
        success: false,
        error: "Insufficient balance",
        current_balance: senderBalance,
      });
    }

    // Get receiver user ID
    const receiverResult = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [receiver]
    );

    if (!receiverResult.rows.length) {
      return res.status(400).json({
        success: false,
        error: "Receiver not found",
      });
    }

    const receiverId = receiverResult.rows[0].id;

    // Perform transfer (update both accounts in transaction)
    await pool.query("BEGIN");

    try {
      // Deduct from sender
      await pool.query(
        "UPDATE accounts SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
        [amount, senderId]
      );

      // Add to receiver
      await pool.query(
        "UPDATE accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
        [amount, receiverId]
      );

      await pool.query("COMMIT");

      // Record transaction (in-memory for demo)
      const transaction = {
        id: transactions.length + 1,
        from: username,
        to: receiver,
        amount: amount,
        timestamp: new Date().toISOString(),
        status: "completed",
      };
      transactions.push(transaction);

      console.log(
        `✅ Transfer completed: ${username} -> ${receiver}: ${amount} VND`
      );

      // Get updated sender balance
      const updatedBalanceResult = await pool.query(
        "SELECT balance FROM accounts WHERE user_id = $1",
        [senderId]
      );

      res.json({
        success: true,
        message: "Transfer completed successfully",
        data: {
          transaction: transaction,
          balance: parseInt(updatedBalanceResult.rows[0].balance),
        },
        verification_layers: {
          gateway_hmac: "verified",
          token: "verified",
          user_signature: "verified",
        },
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("❌ Transfer error:", error.message);
    res.status(500).json({
      success: false,
      error: "Transfer failed: " + error.message,
    });
  }
});

/**
 * Get transaction history
 * POST /internal/history
 */
app.post("/internal/history", threeLayerVerification, async (req, res) => {
  try {
    const username = req.tokenPayload.username;

    console.log(`📜 History request for: ${username}`);

    // Filter transactions for this user
    const userTransactions = transactions.filter(
      (tx) => tx.from === username || tx.to === username
    );

    res.json({
      success: true,
      data: {
        transactions: userTransactions,
        count: userTransactions.length,
      },
      verification_layers: {
        gateway_hmac: "verified",
        token: "verified",
        user_signature: "verified",
      },
    });
  } catch (error) {
    console.error("❌ History query error:", error.message);
    res.status(500).json({
      success: false,
      error: "History query failed",
    });
  }
});

/**
 * Test endpoint - shows what data reached the app
 * POST /internal/test
 */
app.post("/internal/test", verifyGatewayHMAC, (req, res) => {
  res.json({
    success: true,
    message: "Request received by App Service",
    gateway_metadata: req.gatewayEnvelope.gateway_metadata,
    request_structure: {
      has_gateway_envelope: !!req.body.gateway_envelope,
      has_gateway_hmac: !!req.body.gateway_hmac,
      has_user_signature: !!req.gatewayEnvelope.original_request.user_signature,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎯 App Service running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Connected to AAA: ${AAA_URL}`);
  console.log(`   3-Layer Verification: Gateway HMAC → Token → User Signature`);
});
