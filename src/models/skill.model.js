const mongoose = require("mongoose");

const skillsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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
    },
    iconKeyword: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Skill", skillsSchema);