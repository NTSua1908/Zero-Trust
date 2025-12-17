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
const VAULT_KEY_FILE = path.join(__dirname, "..", ".vault-key");

// Encryption settings
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

// Default secrets
const DEFAULT_SECRETS = {
  gateway_hmac_secret: {
    value: "gateway-app-shared-secret-2025",
    created_at: new Date().toISOString(),
    rotations: [],
    ttl_hours: null, // null = no expiration
    encrypted: false, // Mark if value is encrypted
  },
};

// In-memory audit log
let auditLog = [];

/**
 * Get or generate vault encryption key
 */
function getVaultKey() {
  try {
    if (fs.existsSync(VAULT_KEY_FILE)) {
      const key = fs.readFileSync(VAULT_KEY_FILE);
      if (key.length !== KEY_LENGTH) {
        throw new Error("Invalid key length");
      }
      return key;
    }

    // Generate new key
    const key = crypto.randomBytes(KEY_LENGTH);
    fs.writeFileSync(VAULT_KEY_FILE, key, { mode: 0o600 });
    console.log(`🔑 VAULT: Generated new encryption key at ${VAULT_KEY_FILE}`);
    console.log(
      `⚠️  VAULT: Keep this file secure! Without it, secrets cannot be decrypted.`
    );
    return key;
  } catch (error) {
    console.error("❌ VAULT: Error managing encryption key:", error.message);
    throw error;
  }
}

/**
 * AES-256-GCM encryption
 */
function encryptValue(value) {
  try {
    const key = getVaultKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("❌ VAULT: Encryption error:", error.message);
    throw error;
  }
}

/**
 * AES-256-GCM decryption
 */
function decryptValue(encrypted) {
  try {
    const key = getVaultKey();
    const parts = encrypted.split(":");

    if (parts.length !== 3) {
      throw new Error("Invalid encrypted format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("❌ VAULT: Decryption error:", error.message);
    throw error;
  }
}

/**
 * Initialize vault - create if not exists
 */
function initVault() {
  if (!fs.existsSync(VAULT_FILE)) {
    fs.writeFileSync(VAULT_FILE, JSON.stringify(DEFAULT_SECRETS, null, 2));
    console.log(`\n📦 VAULT: Created at ${VAULT_FILE}`);
    console.log(`📦 VAULT: Default secrets initialized`);
    console.log(`📦 VAULT: Audit log: ${AUDIT_FILE}`);
    console.log(`🔐 VAULT: Encryption: AES-256-GCM`);
    console.log(`🔑 VAULT: Key file: ${VAULT_KEY_FILE}\n`);
  } else {
    console.log(`\n📦 VAULT: Loaded from ${VAULT_FILE}`);
    console.log(`🔐 VAULT: Encryption: AES-256-GCM\n`);
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
      // Decrypt if encrypted
      value = secretObj.encrypted
        ? decryptValue(secretObj.value)
        : secretObj.value;
      source = `vault (${
        secretObj.encrypted ? "AES-256-GCM encrypted" : "plaintext"
      })`;
      if (!skipAudit) {
        logAccess("GET", key, "vault", "success");
      }
    }
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
function setSecret(key, value, ttlHours = null, encrypt = true) {
  try {
    const secrets = loadSecrets();
    const existingSecret = secrets[key];

    // Encrypt the value
    const storedValue = encrypt ? encryptValue(value) : value;

    const secretObj = {
      value: storedValue,
      encrypted: encrypt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ttl_hours: ttlHours,
      rotations: existingSecret?.rotations || [],
    };

    // Track rotation history
    if (existingSecret) {
      // Hash the decrypted value for comparison
      const oldValue = existingSecret.encrypted
        ? decryptValue(existingSecret.value)
        : existingSecret.value;

      secretObj.rotations.push({
        rotated_at: new Date().toISOString(),
        prev_value_hash: crypto
          .createHash("sha256")
          .update(oldValue)
          .digest("hex"),
      });
    }

    secrets[key] = secretObj;
    fs.writeFileSync(VAULT_FILE, JSON.stringify(secrets, null, 2));
    console.log(
      `✅ VAULT: Secret updated "${key}"${
        encrypt ? " (AES-256-GCM encrypted)" : ""
      }${ttlHours ? ` (TTL: ${ttlHours}h)` : ""}`
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
  console.log(`   Encryption: AES-256-GCM`);
  console.log(
    `   Key file: ${
      fs.existsSync(VAULT_KEY_FILE) ? "✅ Present" : "❌ Missing"
    }`
  );
  console.log(`   Secrets count: ${Object.keys(secrets).length}`);

  Object.keys(secrets).forEach((key) => {
    const secret = secrets[key];
    const expired = isExpired(secret);
    const ttlInfo = secret.ttl_hours
      ? `(TTL: ${secret.ttl_hours}h)`
      : "(No expiration)";
    const encInfo = secret.encrypted ? "🔐 Encrypted" : "📝 Plaintext";
    const status = expired ? "❌ EXPIRED" : "✅ Active";
    console.log(`   - ${key}: ${status} ${encInfo} ${ttlInfo}`);
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

/**
 * Migrate plaintext secrets to encrypted
 */
function migrateToEncrypted() {
  try {
    const secrets = loadSecrets();
    let migrated = 0;

    Object.keys(secrets).forEach((key) => {
      const secret = secrets[key];
      if (!secret.encrypted) {
        console.log(`🔄 Migrating "${key}" to encrypted storage...`);
        setSecret(key, secret.value, secret.ttl_hours, true);
        migrated++;
      }
    });

    if (migrated > 0) {
      console.log(
        `✅ Migrated ${migrated} secret(s) to AES-256-GCM encryption`
      );
    } else {
      console.log(`✅ All secrets already encrypted`);
    }
  } catch (error) {
    console.error("❌ Migration error:", error.message);
  }
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
  migrateToEncrypted,
};
