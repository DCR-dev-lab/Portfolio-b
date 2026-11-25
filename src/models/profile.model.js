const mongoose = require("mongoose");
const { isSafeHttpUrl } = require("../utils/sanitize");

const optionalSafeUrl = {
  type: String,
  trim: true,
  maxlength: 2048,
  validate: {
    validator: (v) => isSafeHttpUrl(v, { optional: true }),
    message: "URL must use http://, https://, or a safe relative path",
  },
};

const profileSchema = new mongoose.Schema(
  {
    /* ===== Identity (Hero section) ===== */
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    title: {
      type: String,
      required: true, // e.g. "Full Stack MERN Developer"
      trim: true,
      maxlength: 160,
    },

    shortIntro: {
      type: String,
      required: true, // 1–2 lines for Hero
      trim: true,
      maxlength: 200,
    },

    profilePictureUrl: {
      ...optionalSafeUrl,
      required: false,
    },

    resumeUrl: {
      ...optionalSafeUrl,
      required: false,
    },

    /* ===== About section ===== */
    aboutMe: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20000,
    },

    /* ===== Contact ===== */
    email: {
      type: String,
      required: true,
      trim: true,
      maxlength: 254,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Invalid email address format",
      },
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    /* ===== Social Links ===== */
    socialLinks: {
      github: optionalSafeUrl,
      linkedin: optionalSafeUrl,
      twitter: optionalSafeUrl,
      instagram: optionalSafeUrl,
    },

    /* ===== Homepage Display Settings ===== */
    homeProjectsCount: {
      type: Number,
      default: 7,
      min: 1,
      max: 20,
    },

    homeSkillsPerCategory: {
      type: Number,
      default: 8,
      min: 1,
      max: 20,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
