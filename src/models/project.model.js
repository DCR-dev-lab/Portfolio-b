const mongoose = require("mongoose");
const { isSafeHttpUrl } = require("../utils/sanitize");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    longDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20000,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: {
        validator: (v) => isSafeHttpUrl(v),
        message: "imageUrl must use http://, https://, or a safe relative path",
      },
    },
    projectUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: {
        validator: (v) => isSafeHttpUrl(v, { allowHash: true }),
        message: "projectUrl must use http://, https://, or '#'",
      },
    },
    technologies: {
      type: [String],
      required: true,
      validate: {
        validator: (v) =>
          Array.isArray(v) &&
          v.length > 0 &&
          v.length <= 50 &&
          v.every((t) => typeof t === "string" && t.trim().length > 0 && t.length <= 60),
        message: "technologies must contain 1 to 50 valid tags (max 60 chars each)",
      },
    },
    category: {
      type: String,
      required: false,
      trim: true,
      maxlength: 60,
    },
    status: {
      type: String,
      required: false,
      trim: true,
      maxlength: 60,
    },
    type: {
      type: String,
      required: false,
      trim: true,
      maxlength: 60,
    },
    githubUrl: {
      type: String,
      required: false,
      trim: true,
      maxlength: 2048,
      validate: {
        validator: (v) => isSafeHttpUrl(v, { optional: true, allowHash: true }),
        message: "githubUrl must use http:// or https://",
      },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
      max: 10000,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
