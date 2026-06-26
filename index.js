require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./src/app.js");

const PORT = process.env.PORT || 3005;
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("Missing MONGO_URI in environment variables");
  process.exit(1);
}

mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });
