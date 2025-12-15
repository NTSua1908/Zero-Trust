const crypto = require("crypto");
const { ec: EC } = require("elliptic");

const ec = new EC("secp256k1");

/**
 * Generate ECDSA keypair
 * @returns {{privateKey: string, publicKey: string}}
 */
function generateECDSAKeyPair() {
  const keyPair = ec.genKeyPair();
  return {
    privateKey: keyPair.getPrivate("hex"),
    publicKey: keyPair.getPublic("hex"),
  };
}

/**
 * Sign data with ECDSA private key
 * @param {object} data - Data to sign
 * @param {string} privateKeyHex - Private key in hex
 * @returns {string} Signature in hex
 */
function signWithPrivateKey(data, privateKeyHex) {
  const keyPair = ec.keyFromPrivate(privateKeyHex, "hex");
  const dataHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(data))
    .digest();
  const signature = keyPair.sign(dataHash);
  return signature.toDER("hex");
}

/**
 * Verify ECDSA signature
 * @param {object} data - Original data
 * @param {string} signatureHex - Signature in hex
 * @param {string} publicKeyHex - Public key in hex
 * @returns {boolean} True if valid
 */
function verifySignature(data, signatureHex, publicKeyHex) {
  try {
    const keyPair = ec.keyFromPublic(publicKeyHex, "hex");
    const dataHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest();

    // Parse DER signature from hex
    const signatureBuffer = Buffer.from(signatureHex, "hex");
    return keyPair.verify(dataHash, signatureBuffer);
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
