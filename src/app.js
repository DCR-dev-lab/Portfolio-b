const express = require("express");
const cors = require("cors");

const app = express();

const adminRoutes = require("./routes/admin.routes");
const projectRoutes = require("./routes/project.routes");
const skillRoutes = require("./routes/skill.routes");
const profileRoutes = require("./routes/profile.routes");

// Clean, basic array without complex RegEx that won't break your router
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173"
  "http://localhost:4173/"
  "https://dcr-portfolio.vercel.app/"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or postman)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
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