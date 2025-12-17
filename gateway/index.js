const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("../shared/crypto");
const vault = require("../shared/vault");

const app = express();
const PORT = process.env.PORT || 4002;
const AAA_URL = process.env.AAA_URL || "http://localhost:4001";
const APP_URL = process.env.APP_URL || "http://localhost:4003";

// Initialize vault
vault.initVault();
vault.status();
vault.auditStatus(3);
const GATEWAY_HMAC_SECRET = vault.getSecret("gateway_hmac_secret");
console.log(`✅ Gateway: HMAC Secret loaded from vault\n`);

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * Health check
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Gateway",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Vault status endpoint
 */
app.get("/vault/status", (req, res) => {
  res.json({
    secrets: vault.getAllSecrets(),
    audit_log: vault.getAuditLog().slice(-5),
  });
});

/**
 * Login proxy - forwards to AAA Server
 * POST /login
 */
app.post("/login", async (req, res) => {
  try {
    console.log("🔐 Login request received");

    const { username, timestamp, signature } = req.body;

    if (!username || !timestamp || !signature) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Forward to AAA Server
    const loginPayload = {
      username,
      timestamp,
      signature,
    };

    console.log("📤 Gateway → AAA Server (Login):");
    console.log("   Target:", `${AAA_URL}/login`);
    console.log("   Payload:", JSON.stringify(loginPayload, null, 2));

    const response = await axios.post(`${AAA_URL}/login`, loginPayload);

    console.log(`✅ Login successful for: ${username}`);
    res.json(response.data);
  } catch (error) {
    console.error("❌ Login failed:", error.response?.data || error.message);
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { success: false, error: "Login failed" });
  }
});

/**
 * Register proxy - forwards to AAA Server
 * POST /register
 */
app.post("/register", async (req, res) => {
  try {
    console.log("📝 Register request received");

    const { username, publicKey } = req.body;

    if (!username || !publicKey) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Forward to AAA Server
    const registerPayload = {
      username,
      publicKey,
    };

    console.log("📤 Gateway → AAA Server (Register):");
    console.log("   Target:", `${AAA_URL}/register`);
    console.log("   Payload:", JSON.stringify(registerPayload, null, 2));

    const response = await axios.post(`${AAA_URL}/register`, registerPayload);

    console.log(`✅ Registration successful for: ${username}`);
    res.json(response.data);
  } catch (error) {
    console.error(
      "❌ Registration failed:",
      error.response?.data || error.message
    );
    res
      .status(error.response?.status || 500)
      .json(
        error.response?.data || { success: false, error: "Registration failed" }
      );
  }
});

/**
 * Main API gateway - wraps and forwards requests to App Service
 * POST /api/*
 *
 * This endpoint:
 * 1. Receives user request with ECDSA signature
 * 2. Validates basic structure
 * 3. Wraps the request with gateway metadata
 * 4. Signs with HMAC for internal communication
 * 5. Forwards to App Service
 */
app.post("/api/:endpoint", async (req, res) => {
  try {
    const endpoint = req.params.endpoint;
    console.log(`🚪 Gateway processing: /api/${endpoint}`);

    const { protected_payload, user_signature, meta } = req.body;

    if (!protected_payload || !user_signature) {
      return res.status(400).json({
        success: false,
        error: "Invalid request structure",
      });
    }

    // Create gateway envelope
    const gatewayEnvelope = {
      original_request: {
        meta: meta || {},
        protected_payload: protected_payload,
        user_signature: user_signature,
      },
      gateway_metadata: {
        arrival_time: Math.floor(Date.now() / 1000),
        route_id: `route_${endpoint}`,
        gateway_id: "gateway-001",
        client_ip: req.ip,
      },
    };

    // Sign with HMAC for internal security
    const gatewayHmac = crypto.generateHMAC(
      gatewayEnvelope,
      GATEWAY_HMAC_SECRET
    );

    // Prepare request to App Service
    const appRequest = {
      gateway_envelope: gatewayEnvelope,
      gateway_hmac: gatewayHmac,
    };

    console.log("📤 Gateway → App Service (API Call):");
    console.log("   Target:", `${APP_URL}/internal/${endpoint}`);
    console.log(
      "   Gateway Envelope:",
      JSON.stringify(gatewayEnvelope, null, 2)
    );
    console.log("   HMAC Signature:", gatewayHmac.substring(0, 32) + "...");
    console.log("🔒 Request wrapped with HMAC, forwarding to App Service...\n");

    // Forward to App Service
    const response = await axios.post(
      `${APP_URL}/internal/${endpoint}`,
      appRequest,
      { timeout: 30000 }
    );

    console.log(`✅ Response received from App Service`);
    res.json(response.data);
  } catch (error) {
    if (error.response) {
      console.error("❌ App Service error:", error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === "ECONNREFUSED") {
      console.error("❌ Cannot connect to App Service");
      res.status(503).json({
        success: false,
        error: "App Service unavailable",
      });
    } else {
      console.error("❌ Gateway error:", error.message);
      res.status(500).json({
        success: false,
        error: "Gateway processing failed",
      });
    }
  }
});

/**
 * Fallback for other methods
 */
app.all("/api/*", (req, res) => {
  res.status(405).json({
    success: false,
    error: "Method not allowed. Use POST.",
  });
});

/**
 * Test endpoint to verify Gateway-App HMAC
 * POST /test/hmac
 */
app.post("/test/hmac", (req, res) => {
  const testData = { test: "data", timestamp: Date.now() };
  const hmac = crypto.generateHMAC(testData, GATEWAY_HMAC_SECRET);

  res.json({
    success: true,
    testData: testData,
    hmac: hmac,
    message: "Use this to test HMAC verification",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚪 Gateway running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Connected to AAA: ${AAA_URL}`);
  console.log(`   Connected to App: ${APP_URL}`);
});
