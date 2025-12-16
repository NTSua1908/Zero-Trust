/**
 * Advanced Vault - Store and manage secrets with audit, rotation history, and encryption
 * Features: TTL expiration, rotation history, base64 encryption, access audit
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Vault file location
const VAULT_FILE = path.join(__dirname, "..", "secrets.json");
const AUDIT_FILE = path.join(__dirname, "..", "vault-audit.json");

// Default secrets
const DEFAULT_SECRETS = {
  gateway_hmac_secret: {
    value: "gateway-app-shared-secret-2025",
    created_at: new Date().toISOString(),
    rotations: [],
    ttl_hours: null, // null = no expiration
  },
};

// In-memory audit log
let auditLog = [];

/**
 * Simple encryption helper
 */
function encryptValue(value) {
  return Buffer.from(value).toString("base64");
}

function decryptValue(encrypted) {
  return Buffer.from(encrypted, "base64").toString("utf-8");
}

/**
 * Initialize vault - create if not exists
 */
function initVault() {
  if (!fs.existsSync(VAULT_FILE)) {
    fs.writeFileSync(VAULT_FILE, JSON.stringify(DEFAULT_SECRETS, null, 2));
    console.log(`\n📦 VAULT: Created at ${VAULT_FILE}`);
    console.log(`📦 VAULT: Default secrets initialized`);
    console.log(`📦 VAULT: Audit log: ${AUDIT_FILE}\n`);
  } else {
    console.log(`\n📦 VAULT: Loaded from ${VAULT_FILE}\n`);
  }
}

/**
 * Check if secret is expired
 */
function isExpired(secret) {
  if (!secret.ttl_hours || secret.ttl_hours === null) {
    return false;
  }

  const createdTime = new Date(secret.created_at).getTime();
  const expirationTime = createdTime + secret.ttl_hours * 60 * 60 * 1000;
  return Date.now() > expirationTime;
}

/**
 * Log access to audit
 */
function logAccess(action, key, source, status = "success") {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    key,
    source,
    status,
  };
  auditLog.push(logEntry);

  // Persist to file
  try {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditLog, null, 2));
  } catch (error) {
    console.error("❌ VAULT: Error writing audit log:", error.message);
  }
}

/**
 * Load all secrets from vault
 */
function loadSecrets() {
  try {
    if (!fs.existsSync(VAULT_FILE)) {
      initVault();
    }
    const data = fs.readFileSync(VAULT_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ VAULT: Error loading secrets:", error.message);
    return DEFAULT_SECRETS;
  }
}

/**
 * Get a specific secret by key
 */
function getSecret(key, skipAudit = false) {
  const secrets = loadSecrets();
  const secretObj = secrets[key];
  const envValue = process.env[key.toUpperCase()];

  let source = "default";
  let value = DEFAULT_SECRETS[key]?.value;
  let isExpiredFlag = false;

  if (secretObj) {
    if (isExpired(secretObj)) {
      console.warn(`⚠️ VAULT: Secret expired: ${key}`);
      isExpiredFlag = true;
      source = "vault (EXPIRED)";
      logAccess("GET", key, "vault-expired", "expired");
    } else {
      value = secretObj.value;
      source = "vault (secrets.json)";
      if (!skipAudit) {
        logAccess("GET", key, "vault", "success");
      }
    }
  } else if (envValue) {
    value = envValue;
    source = "environment variable";
    logAccess("GET", key, "environment", "success");
  }

  console.log(`🔐 VAULT: getSecret("${key}") → ${source}`);

  if (!value) {
    console.warn(`⚠️ VAULT: Secret not found: ${key}`);
    return DEFAULT_SECRETS[key]?.value || null;
  }

  return value;
}

/**
 * Set a secret with optional TTL (in hours)
 */
function setSecret(key, value, ttlHours = null) {
  try {
    const secrets = loadSecrets();
    const existingSecret = secrets[key];

    const secretObj = {
      value: value,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ttl_hours: ttlHours,
      rotations: existingSecret?.rotations || [],
    };

    // Track rotation history
    if (existingSecret) {
      secretObj.rotations.push({
        rotated_at: new Date().toISOString(),
        prev_value_hash: crypto
          .createHash("sha256")
          .update(existingSecret.value)
          .digest("hex"),
      });
    }

    secrets[key] = secretObj;
    fs.writeFileSync(VAULT_FILE, JSON.stringify(secrets, null, 2));
    console.log(
      `✅ VAULT: Secret updated "${key}"${
        ttlHours ? ` (TTL: ${ttlHours}h)` : ""
      }`
    );
    logAccess("SET", key, "vault-update", "success");
  } catch (error) {
    console.error(`❌ VAULT: Error setting secret "${key}":`, error.message);
    logAccess("SET", key, "vault-update", "error");
  }
}

/**
 * Get all secrets (for debugging)
 */
function getAllSecrets() {
  const secrets = loadSecrets();
  // Return only keys, not values for security
  return Object.keys(secrets).map((key) => ({
    key,
    created_at: secrets[key].created_at,
    updated_at: secrets[key].updated_at,
    ttl_hours: secrets[key].ttl_hours,
    is_expired: isExpired(secrets[key]),
    rotation_count: secrets[key].rotations?.length || 0,
  }));
}

/**
 * Print vault status
 */
function status() {
  const secrets = loadSecrets();
  console.log("\n📋 VAULT STATUS:");
  console.log(`   File: ${VAULT_FILE}`);
  console.log(`   Exists: ${fs.existsSync(VAULT_FILE) ? "✅ Yes" : "❌ No"}`);
  console.log(`   Secrets count: ${Object.keys(secrets).length}`);

  Object.keys(secrets).forEach((key) => {
    const secret = secrets[key];
    const expired = isExpired(secret);
    const ttlInfo = secret.ttl_hours
      ? `(TTL: ${secret.ttl_hours}h)`
      : "(No expiration)";
    const status = expired ? "❌ EXPIRED" : "✅ Active";
    console.log(`   - ${key}: ${status} ${ttlInfo}`);
  });
  console.log();
}

/**
 * Get audit log
 */
function getAuditLog() {
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      const data = fs.readFileSync(AUDIT_FILE, "utf-8");
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Print recent audit entries
 */
function auditStatus(limit = 5) {
  const log = getAuditLog();
  const recent = log.slice(-limit);

  console.log(`\n📝 VAULT AUDIT (Last ${limit} entries):`);
  recent.forEach((entry) => {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const status = entry.status === "success" ? "✅" : "❌";
    console.log(
      `   ${time} | ${status} ${entry.action} "${entry.key}" (${entry.source})`
    );
  });
}

module.exports = {
  initVault,
  getSecret,
  setSecret,
  getAllSecrets,
  status,
  auditStatus,
  getAuditLog,
  isExpired,
};
