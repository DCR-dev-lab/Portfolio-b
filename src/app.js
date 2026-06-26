const express = require("express");
const cors = require("cors");

const app = express();

const adminRoutes = require("./routes/admin.routes");
const projectRoutes = require("./routes/project.routes");
const skillRoutes = require("./routes/skill.routes");
const profileRoutes = require("./routes/profile.routes");

app.use(cors({ origin: true, credentials: true, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));
app.use(express.json());

app.use("/api", adminRoutes);
app.use("/api", projectRoutes);
app.use("/api", skillRoutes);
app.use("/api", profileRoutes);

app.get("/", (req, res) => {
  res.send("Portfolio Backend is running");
});

module.exports = app;
