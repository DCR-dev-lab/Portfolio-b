const express = require("express");
const {
  getAllProjects,
  getProjectsById,
} = require("../controllers/project.controller");
const router = express.Router();

router.get("/projects", getAllProjects);
router.get("/projects/:id", getProjectsById);

module.exports = router;
