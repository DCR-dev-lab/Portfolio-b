require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./src/app.js");

const PORT = process.env.PORT || 3005;
const mongoURI = process.env.MONGO_URI;

const requiredEnvs = ["MONGO_URI", "ADMIN_SECRET", "JWT_SECRET"];
for (const envKey of requiredEnvs) {
  if (!process.env[envKey]) {
    console.error(`[Fatal] Missing required environment variable: ${envKey}`);
    process.exit(1);
  }
}

mongoose.set("sanitizeFilter", true);

let server;

mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("Connected to MongoDB");
    server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    // Harden HTTP server timeouts against Slowloris / slow-body attacks
    server.requestTimeout = 30000;
    server.headersTimeout = 15000;
    server.keepAliveTimeout = 65000;
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });

const shutdown = (signal) => {
  console.log(`[Server] Received ${signal}, shutting down gracefully...`);
  if (server) {
    server.close(() => {
      mongoose.connection.close(false).then(() => process.exit(0));
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("[UnhandledRejection]", reason);
});
