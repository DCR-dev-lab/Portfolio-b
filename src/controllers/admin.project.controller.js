const project = require("../models/project.model");
const { logAudit } = require("./audit.controller");
const { deleteCloudinaryImage } = require("../utils/cloudinary");
const { sortProjects } = require("../utils/sortProjects");

// Create a new project

exports.createProject = async (req, res) => {
  try {
    const newProject = new project(req.body);
    const saveProject = await newProject.save();
    await logAudit("CREATE_PROJECT", "Project", saveProject._id.toString(), saveProject.title);
    res.status(201).json(saveProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all projects

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await project.find({});

    if (projects.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(sortProjects(projects));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk reorder projects by array of IDs

exports.reorderProjects = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ message: "orderedIds must be a non-empty array" });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index + 1 } },
      },
    }));

    await project.bulkWrite(bulkOps);
    await logAudit("REORDER_PROJECTS", "Project", null, `${orderedIds.length} projects`);
    res.status(200).json({ message: "Projects reordered successfully" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid project ID format" });
    }
    res.status(500).json({ message: error.message });
  }
};

// Delete a project by ID

exports.deleteProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProject = await project.findByIdAndDelete(id);
    if (!deletedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Clean up Cloudinary asset if present
    if (deletedProject.imageUrl) {
      await deleteCloudinaryImage(deletedProject.imageUrl);
    }

    await logAudit("DELETE_PROJECT", "Project", id, deletedProject.title);
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid project ID format" });
    }
    res.status(500).json({ message: error.message });
  }
};

// Update a project by ID

exports.updateProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check existing project to detect image change
    const existingProject = await project.findById(id);
    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    const oldImageUrl = existingProject.imageUrl;
    const newImageUrl = req.body.imageUrl;

    // If image has been replaced, destroy the old one in Cloudinary
    if (newImageUrl && oldImageUrl && newImageUrl !== oldImageUrl) {
      await deleteCloudinaryImage(oldImageUrl);
    }

    Object.assign(existingProject, req.body);
    const updatedProject = await existingProject.save();

    await logAudit("UPDATE_PROJECT", "Project", id, updatedProject.title);
    res.status(200).json(updatedProject);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid project ID format" });
    }
    res.status(500).json({ message: error.message });
  }
};
