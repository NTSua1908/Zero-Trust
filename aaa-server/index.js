const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const crypto = require("../shared/crypto");

const app = express();
const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || "aaa-server-secret-key-2025";

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "zerotrust",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

// Initialize database
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE NOT NULL,
        balance BIGINT NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'VND',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        details JSONB
      )
    `);

    console.log("✅ Database initialized");
  } catch (error) {
    console.error("❌ Database init error:", error.message);
  }
}

// Routes

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "AAA Server",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Register new user
 * POST /register
 * Body: { username, publicKey }
 */
app.post("/register", async (req, res) => {
  try {
    const { username, publicKey } = req.body;

    if (!username || !publicKey) {
      return res.status(400).json({
        success: false,
        error: "Username and publicKey are required",
      });
    }

    // Validate public key format
    if (!/^[0-9a-fA-F]+$/.test(publicKey)) {
      return res.status(400).json({
        success: false,
        error: "Invalid public key format",
      });
    }

    // Insert user
    const result = await pool.query(
      "INSERT INTO users (username, public_key) VALUES ($1, $2) RETURNING id, username, created_at",
      [username, publicKey]
    );

    // Initialize user account with starting balance (for demo purposes)
    const userId = result.rows[0].id;
    const initialBalance = 1000000; // 1,000,000 VND for demo

    await pool.query(
      "INSERT INTO accounts (user_id, balance, currency) VALUES ($1, $2, $3)",
      [userId, initialBalance, "VND"]
    );

    // Log the registration
    await pool.query(
      "INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)",
      [userId, "REGISTER", req.ip, JSON.stringify({ username, initialBalance })]
    );

    console.log(`✅ User registered: ${username} with ${initialBalance} VND`);

    res.json({
      success: true,
      message: "User registered successfully",
      user: result.rows[0],
      initialBalance: initialBalance,
    });
  } catch (error) {
    if (error.code === "23505") {
      // Unique violation
      return res.status(409).json({
        success: false,
        error: "Username already exists",
      });
    }

    console.error("Register error:", error.message);
    res.status(500).json({
      success: false,
      error: "Registration failed",
    });
  }
});

/**
 * Login endpoint
 * POST /login
 * Body: { username, timestamp, signature }
 */
app.post("/login", async (req, res) => {
  try {
    const { username, timestamp, signature } = req.body;

    if (!username || !timestamp || !signature) {
      return res.status(400).json({
        success: false,
        error: "Username, timestamp, and signature are required",
      });
    }

    // Check timestamp (prevent replay attacks - max 5 minutes old)
    // Handle both seconds and milliseconds timestamp formats
    const now = Date.now();
    const requestTime = timestamp > 9999999999 ? timestamp : timestamp * 1000;
    const timeDiff = Math.abs(now - requestTime);

    console.log(
      `[TIMESTAMP DEBUG] now=${now}, request=${timestamp}, converted=${requestTime}, diff=${timeDiff}ms`
    );

    if (timeDiff > 300000) {
      // 5 minutes in milliseconds
      console.log(
        `[TIMESTAMP REJECTED] Diff ${timeDiff}ms exceeds 300000ms limit`
      );
      return res.status(401).json({
        success: false,
        error: "Timestamp expired or invalid",
      });
    }

    // Get user's public key
    const userResult = await pool.query(
      "SELECT id, username, public_key FROM users WHERE username = $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const user = userResult.rows[0];

    // Verify ECDSA signature
    const loginData = { username, timestamp };
    const isValid = crypto.verifySignature(
      loginData,
      signature,
      user.public_key
    );

    if (!isValid) {
      // Log failed attempt
      await pool.query(
        "INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)",
        [
          user.id,
          "LOGIN_FAILED",
          req.ip,
          JSON.stringify({ reason: "Invalid signature" }),
        ]
      );

      return res.status(401).json({
        success: false,
        error: "Invalid signature",
      });
    }

    // Generate JWT token
    const token = crypto.generateToken(
      {
        userId: user.id,
        username: user.username,
        publicKey: user.public_key,
      },
      JWT_SECRET,
      3600 // 1 hour
    );

    // Update last login
    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    // Log successful login
    await pool.query(
      "INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)",
      [user.id, "LOGIN_SUCCESS", req.ip, JSON.stringify({ timestamp })]
    );

    console.log(`✅ Login successful: ${username}`);

    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
});

/**
 * Verify token endpoint (used by Gateway/App)
 * POST /verify-token
 * Body: { token }
 */
app.post("/verify-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token is required",
      });
    }

    const payload = crypto.verifyToken(token, JWT_SECRET);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    res.json({
      success: true,
      payload: payload,
    });
  } catch (error) {
    console.error("Token verification error:", error.message);
    res.status(500).json({
      success: false,
      error: "Token verification failed",
    });
  }
});

/**
 * Get user's public key (used by App for signature verification)
 * GET /users/:username/public-key
 */
app.get("/users/:username/public-key", async (req, res) => {
  try {
    const { username } = req.params;

    const result = await pool.query(
      "SELECT public_key FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      publicKey: result.rows[0].public_key,
    });
  } catch (error) {
    console.error("Public key fetch error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch public key",
    });
  }
});

/**
 * Get audit logs (admin endpoint)
 * GET /audit-logs?userId=123&limit=50
 */
app.get("/audit-logs", async (req, res) => {
  try {
    const { userId, limit = 50 } = req.query;

    let query = "SELECT * FROM audit_logs";
    const params = [];

    if (userId) {
      query += " WHERE user_id = $1";
      params.push(userId);
    }

    query += " ORDER BY timestamp DESC LIMIT $" + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      logs: result.rows,
    });
  } catch (error) {
    console.error("Audit logs fetch error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch audit logs",
    });
  }
});

// Start server
async function start() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`🔐 AAA Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
  });
}

start();
