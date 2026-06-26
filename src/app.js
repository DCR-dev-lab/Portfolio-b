const express = require("express");
const cors = require("cors");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://portfolio-frontend-*.vercel.app",
];

const adminRoutes = require("./routes/admin.routes");
const projectRoutes = require("./routes/project.routes");
const skillRoutes = require("./routes/skill.routes");
const profileRoutes = require("./routes/profile.routes");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((allowedOrigin) => {
        if (allowedOrigin.includes("*")) {
          const regex = new RegExp(`^${allowedOrigin.replace(/\*/g, ".*")}$`);
          return regex.test(origin);
        }
        return origin === allowedOrigin;
      })) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(express.json());

app.use("/api", adminRoutes);
app.use("/api", projectRoutes);
app.use("/api", skillRoutes);
app.use("/api", profileRoutes);

app.get("/", (req, res) => {
  res.send("Portfolio Backend is running");
});

module.exports = app;
