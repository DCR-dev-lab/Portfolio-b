const jwt = require("jsonwebtoken");
const { isTokenRevoked } = require("../utils/tokenRevocation");

const adminGuard = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Admin token missing" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Admin token missing" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("[AuthGuard] JWT_SECRET is not configured");
    return res.status(500).json({ message: "Authentication service unavailable" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
      issuer: "portfolio-backend",
      audience: "portfolio-admin",
    });

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (decoded.jti && isTokenRevoked(decoded.jti)) {
      return res.status(401).json({ message: "Token has been revoked" });
    }

    req.adminAuth = {
      role: decoded.role,
      jti: decoded.jti,
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = adminGuard;
