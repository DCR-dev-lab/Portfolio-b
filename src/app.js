const express = require("express");
const cors = require("cors");

const app = express();

const adminRoutes = require("./routes/admin.routes");
const projectRoutes = require("./routes/project.routes");
const skillRoutes = require("./routes/skill.routes");
const profileRoutes = require("./routes/profile.routes");

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "https://dcr-portfolio.vercel.app",
  "https://dcrportfolio.vercel.app",
  "https://resonant-helpful-gerbil.ngrok-free.dev/",
];

const normalizeOrigin = (value) => (value ? value.replace(/\/+$/, "") : value);

app.use(
  cors({
    origin: (origin, callback) => {
      const normalizedOrigin = normalizeOrigin(origin);
      const isAllowedOrigin =
        !origin ||
        allowedOrigins.includes(normalizedOrigin) ||
        (normalizedOrigin &&
          /\.(vercel\.app|onrender\.com)$/i.test(normalizedOrigin));

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

app.use(express.json());

app.use("/api", adminRoutes);
app.use("/api", projectRoutes);
app.use("/api", skillRoutes);
app.use("/api", profileRoutes);

app.get("/", (req, res) => {
  res.send("Portfolio Backend is running");
});

module.exports = app;
