const project = require("../models/project.model");

// Create a new project

exports.createProject = async (req, res) => {
  try {
    const newProject = new project(req.body);
    const saveProject = await newProject.save();
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

    res.status(200).json(projects);
  } catch (error) {
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
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a project by ID

exports.updateProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedProject = await project.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
