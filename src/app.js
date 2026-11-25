const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// Trust reverse proxies (Render, Vercel, Ngrok, Cloudflare) so req.ip resolves to actual client IP
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Global rate limiter for all /api endpoints: 150 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

const adminRoutes = require("./routes/admin.routes");
const projectRoutes = require("./routes/project.routes");
const skillRoutes = require("./routes/skill.routes");
const profileRoutes = require("./routes/profile.routes");
const { sanitizeBody } = require("./utils/sanitize");

const normalizeOrigin = (value) => (value ? value.replace(/\/+$/, "") : value);

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "https://dcr-portfolio.vercel.app",
  "https://dcrportfolio.vercel.app",
  process.env.NODE_ENV !== "production"
    ? "https://resonant-helpful-gerbil.ngrok-free.dev"
    : null,
  normalizeOrigin(process.env.FRONTEND_URL),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      const normalizedOrigin = normalizeOrigin(origin);
      const isAllowedOrigin =
        !origin || allowedOrigins.includes(normalizedOrigin);

      if (isAllowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "50kb" }));
app.use(sanitizeBody);

// Apply rate limiting across all API routes
app.use("/api", apiLimiter);

app.use("/api", adminRoutes);
app.use("/api", projectRoutes);
app.use("/api", skillRoutes);
app.use("/api", profileRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

app.get("/", (req, res) => {
  res.send("Portfolio Backend is running");
});

// Centralized error-handling middleware (prevents stack-trace leaks)
app.use((err, req, res, next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "Origin not allowed by CORS" });
  }

  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request payload exceeds 50kb limit" });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Malformed JSON payload" });
  }

  console.error("[ServerError]", err?.message || err);
  res.status(500).json({ message: "An unexpected server error occurred" });
});

module.exports = app;
