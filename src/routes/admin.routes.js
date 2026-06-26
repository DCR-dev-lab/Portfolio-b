const express = require("express");
const router = express.Router();

const adminGuard = require("../middleware/admin.guard");
const { adminLogin } = require("../controllers/admin.auth.controller");

const {
  createProject,
  getAllProjects,
  deleteProjectById,
  updateProjectById,
} = require("../controllers/admin.project.controller");

const {
  createSkill,
  getAllSkills,
  deleteSkillById,
  updateSkillById,
} = require("../controllers/admin.skill.controller");

const {
  getAdminProfile,
  updateAdminProfile,
} = require("../controllers/admin.profile.controller");

// 🔓 Login route (NO middleware)
router.post("/admin/login", adminLogin);

// 🔐 Protect everything below
router.use("/admin", adminGuard);

// Projects
router.post("/admin/dashboard/projects", createProject);
router.get("/admin/dashboard/projects", getAllProjects);
router.delete("/admin/dashboard/projects/:id", deleteProjectById);
router.put("/admin/dashboard/projects/:id", updateProjectById);

// Skills
router.post("/admin/dashboard/skills", createSkill);
router.get("/admin/dashboard/skills", getAllSkills);
router.delete("/admin/dashboard/skills/:id", deleteSkillById);
router.put("/admin/dashboard/skills/:id", updateSkillById);

// Profile
router.get("/admin/profile", getAdminProfile);
router.put("/admin/profile", updateAdminProfile);

module.exports = router;
