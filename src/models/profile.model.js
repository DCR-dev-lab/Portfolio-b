const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    /* ===== Identity (Hero section) ===== */
    fullName: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true, // e.g. "Full Stack MERN Developer"
    },

    shortIntro: {
      type: String,
      required: true, // 1–2 lines for Hero
      maxlength: 200,
    },

    profilePictureUrl: {
      type: String,
      required: false,
    },

    resumeUrl: {
      type: String,
      required: false,
    },

    /* ===== About section ===== */
    aboutMe: {
      type: String,
      required: true,
    },

    /* ===== Contact ===== */
    email: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    /* ===== Social Links ===== */
    socialLinks: {
      github: { type: String },
      linkedin: { type: String },
      twitter: { type: String },
      instagram: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
