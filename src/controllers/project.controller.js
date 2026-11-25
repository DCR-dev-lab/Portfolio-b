const project = require("../models/project.model");
const { sortProjects } = require("../utils/sortProjects");

const getAllProjects = async (req, res) => {
  try {
    const projects = await project.find({});
    res.status(200).json(sortProjects(projects ?? []));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectsById = async (req, res) => {
  try {
    const { id } = req.params;
    const projectData = await project.findById(id);
    if (!projectData) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json(projectData);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid project ID format" });
    }
    res.status(500).json({ message: "Failed to fetch project" });
  }
};

module.exports = {
  getAllProjects,
  getProjectsById,
};
