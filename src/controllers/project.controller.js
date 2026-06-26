const project = require("../models/project.model");

const getAllProjects = async (req, res) => {
  try {
    const projects = await project.find({});
    res.status(200).json(projects ?? []);
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
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllProjects,
  getProjectsById,
};
