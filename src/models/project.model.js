const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    shortDescription: {
      type: String,
      required: true,
    },
    longDescription: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    projectUrl: {
      type: String,
      required: true,
    },
    technologies: {
      type: [String],
      required: true,
    },
    category: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      required: false,
    },
    githubUrl: {
      type: String,
      required: false,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
