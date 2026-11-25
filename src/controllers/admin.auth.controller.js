const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { revokeToken } = require("../utils/tokenRevocation");

/**
 * Constant-time comparison between user input and environment secret
 * to prevent side-channel timing attacks.
 */
function safeCompare(input, secret) {
  if (typeof input !== "string" || typeof secret !== "string") return false;
  const inputHash = crypto.createHash("sha256").update(input).digest();
  const secretHash = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(inputHash, secretHash);
}

const adminLogin = (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { key } = body;

  if (!key || typeof key !== "string") {
    return res.status(400).json({ message: "Admin key required" });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const jwtSecret = process.env.JWT_SECRET;

  if (!adminSecret || !jwtSecret) {
    console.error("[Auth] Missing ADMIN_SECRET or JWT_SECRET configuration");
    return res.status(500).json({ message: "Server authentication misconfigured" });
  }

  if (!safeCompare(key, adminSecret)) {
    console.warn(`[Auth] Failed admin key attempt from IP: ${req.ip || req.socket.remoteAddress}`);
    return res.status(401).json({ message: "Invalid admin key" });
  }

  const token = jwt.sign({ role: "admin" }, jwtSecret, {
    expiresIn: "30m",
    jwtid: crypto.randomUUID(),
    issuer: "portfolio-backend",
    audience: "portfolio-admin",
  });

  res.status(200).json({ token });
};

const adminLogout = (req, res) => {
  if (req.adminAuth?.jti) {
    revokeToken(req.adminAuth.jti, req.adminAuth.exp);
  }
  res.status(200).json({ message: "Logged out successfully" });
};

module.exports = { adminLogin, adminLogout };
