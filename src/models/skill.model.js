const mongoose = require("mongoose");

const skillsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    proficiency: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    iconKeyword: {
      type: String,
      required: false,
      trim: true,
      maxlength: 60,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Skill", skillsSchema);