const SAFE_WEB_PROTOCOLS = new Set(["http:", "https:"]);
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Recursively clones plain objects/arrays while removing prototype-pollution keys
 * and MongoDB operator/dot-notation keys (keys starting with '$' or containing '.').
 */
function stripDangerousKeys(value) {
  if (Array.isArray(value)) {
    return value.map(stripDangerousKeys);
  }

  if (value !== null && typeof value === "object") {
    const clean = {};
    for (const key of Object.keys(value)) {
      if (
        DANGEROUS_KEYS.has(key) ||
        key.startsWith("$") ||
        key.includes(".")
      ) {
        continue;
      }
      clean[key] = stripDangerousKeys(value[key]);
    }
    return clean;
  }

  return value;
}

/**
 * Express middleware that ensures req.body (when present) is sanitized against
 * prototype pollution and MongoDB $-operator injection.
 */
function sanitizeBody(req, res, next) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ message: "Request body must be a JSON object" });
    }
    req.body = stripDangerousKeys(req.body);
  }
  next();
}

/**
 * Returns a plain object containing only allowlisted keys from `source`.
 */
function pickFields(source, allowedKeys) {
  const picked = {};
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return picked;
  }
  for (const key of allowedKeys) {
    if (Object.hasOwn(source, key) && source[key] !== undefined) {
      picked[key] = source[key];
    }
  }
  return picked;
}

/**
 * Validates that a URL uses http/https (or optional relative path / '#' placeholder).
 * Explicitly rejects javascript:, vbscript:, data:, file:, etc.
 */
function isSafeHttpUrl(url, { optional = false, allowHash = false, allowRelative = true } = {}) {
  if (url === undefined || url === null || (typeof url === "string" && url.trim() === "")) {
    return optional;
  }
  if (typeof url !== "string") return false;

  const trimmed = url.trim();
  if (allowHash && trimmed === "#") return true;
  if (allowRelative && trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return SAFE_WEB_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

module.exports = {
  stripDangerousKeys,
  sanitizeBody,
  pickFields,
  isSafeHttpUrl,
};
