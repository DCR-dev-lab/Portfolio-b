/**
 * In-memory revocation list for logged-out JWT IDs (jti).
 * Automatically prunes expired entries to keep memory usage bounded.
 */
const revokedTokens = new Map();
const MAX_REVOKED_ENTRIES = 5000;

function pruneExpired() {
  const now = Date.now();
  for (const [jti, expiresAtMs] of revokedTokens.entries()) {
    if (expiresAtMs <= now) {
      revokedTokens.delete(jti);
    }
  }
}

/**
 * Marks a JWT ID as revoked until its original expiration timestamp.
 * @param {string} jti - Unique JWT ID
 * @param {number} expSeconds - JWT `exp` claim (Unix timestamp in seconds)
 */
function revokeToken(jti, expSeconds) {
  if (!jti || typeof jti !== "string") return;

  pruneExpired();
  if (revokedTokens.size >= MAX_REVOKED_ENTRIES) {
    const oldestKey = revokedTokens.keys().next().value;
    if (oldestKey) revokedTokens.delete(oldestKey);
  }

  const expiresAtMs =
    typeof expSeconds === "number" && Number.isFinite(expSeconds)
      ? expSeconds * 1000
      : Date.now() + 30 * 60 * 1000;

  if (expiresAtMs > Date.now()) {
    revokedTokens.set(jti, expiresAtMs);
  }
}

/**
 * Checks whether a JWT ID has been explicitly revoked.
 * @param {string} jti
 * @returns {boolean}
 */
function isTokenRevoked(jti) {
  if (!jti || typeof jti !== "string") return false;
  const expiresAtMs = revokedTokens.get(jti);
  if (!expiresAtMs) return false;
  if (expiresAtMs <= Date.now()) {
    revokedTokens.delete(jti);
    return false;
  }
  return true;
}

module.exports = {
  revokeToken,
  isTokenRevoked,
};
