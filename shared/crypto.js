const crypto = require("crypto");
const nacl = require("tweetnacl");
const { encodeBase64, decodeBase64 } = require("tweetnacl-util");

/**
 * Generate Ed25519 keypair (Curve25519 for signatures)
 * @returns {{privateKey: string, publicKey: string}}
 */
function generateECDSAKeyPair() {
  const keyPair = nacl.sign.keyPair();
  return {
    privateKey: Buffer.from(keyPair.secretKey).toString("hex"),
    publicKey: Buffer.from(keyPair.publicKey).toString("hex"),
  };
}

/**
 * Sign data with Ed25519 private key
 * @param {object} data - Data to sign
 * @param {string} privateKeyHex - Private key in hex (64 bytes)
 * @returns {string} Signature in hex
 */
function signWithPrivateKey(data, privateKeyHex) {
  const message = Buffer.from(JSON.stringify(data), "utf8");
  const secretKey = Buffer.from(privateKeyHex, "hex");
  const signature = nacl.sign.detached(message, secretKey);
  return Buffer.from(signature).toString("hex");
}

/**
 * Verify Ed25519 signature
 * @param {object} data - Original data
 * @param {string} signatureHex - Signature in hex (64 bytes)
 * @param {string} publicKeyHex - Public key in hex (32 bytes)
 * @returns {boolean} True if valid
 */
function verifySignature(data, signatureHex, publicKeyHex) {
  try {
    const message = Buffer.from(JSON.stringify(data), "utf8");
    const signature = Buffer.from(signatureHex, "hex");
    const publicKey = Buffer.from(publicKeyHex, "hex");

    return nacl.sign.detached.verify(message, signature, publicKey);
  } catch (error) {
    console.error("Signature verification error:", error.message);
    console.error("  Data:", JSON.stringify(data));
    console.error(
      "  Signature hex:",
      signatureHex ? signatureHex.substring(0, 50) + "..." : "null"
    );
    console.error(
      "  Public key:",
      publicKeyHex ? publicKeyHex.substring(0, 50) + "..." : "null"
    );
    return false;
  }
}

/**
 * Generate HMAC for data
 * @param {object} data - Data to sign
 * @param {string} sharedSecret - Shared secret key
 * @returns {string} HMAC in hex
 */
function generateHMAC(data, sharedSecret) {
  const hmac = crypto.createHmac("sha256", sharedSecret);
  hmac.update(JSON.stringify(data));
  return hmac.digest("hex");
}

/**
 * Verify HMAC
 * @param {object} data - Original data
 * @param {string} hmacHex - HMAC to verify
 * @param {string} sharedSecret - Shared secret key
 * @returns {boolean} True if valid
 */
function verifyHMAC(data, hmacHex, sharedSecret) {
  const expectedHmac = generateHMAC(data, sharedSecret);
  return crypto.timingSafeEqual(
    Buffer.from(hmacHex, "hex"),
    Buffer.from(expectedHmac, "hex")
  );
}

/**
 * Apply padding to data to reach target size
 * @param {object} data - Data to pad
 * @param {number} targetSize - Target size in bytes (default 4096 = 4KB)
 * @returns {object} Padded data with random padding
 */
function applyPadding(data, targetSize = 4096) {
  const dataStr = JSON.stringify(data);
  const dataSize = Buffer.byteLength(dataStr, "utf8");

  if (dataSize >= targetSize) {
    // Data already exceeds target, return as is
    return {
      data: data,
      padding: "",
      originalSize: dataSize,
    };
  }

  const paddingSize = targetSize - dataSize - 100; // Reserve space for metadata
  const padding = crypto.randomBytes(paddingSize).toString("hex");

  return {
    data: data,
    padding: padding,
    originalSize: dataSize,
  };
}

/**
 * Remove padding from data
 * @param {object} paddedData - Padded data object
 * @returns {object} Original data
 */
function removePadding(paddedData) {
  return paddedData.data;
}

/**
 * Generate JWT-like token (simplified)
 * @param {object} payload - Token payload
 * @param {string} secret - Secret key for signing
 * @param {number} expiresIn - Expiration in seconds (default 3600)
 * @returns {string} Token
 */
function generateToken(payload, secret, expiresIn = 3600) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(tokenPayload)).toString(
    "base64url"
  );

  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verify and decode JWT-like token
 * @param {string} token - Token to verify
 * @param {string} secret - Secret key
 * @returns {object|null} Decoded payload or null if invalid
 */
function verifyToken(token, secret) {
  try {
    const [headerB64, payloadB64, signature] = token.split(".");

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Token verification error:", error.message);
    return null;
  }
}

module.exports = {
  generateECDSAKeyPair,
  signWithPrivateKey,
  verifySignature,
  generateHMAC,
  verifyHMAC,
  applyPadding,
  removePadding,
  generateToken,
  verifyToken,
};
