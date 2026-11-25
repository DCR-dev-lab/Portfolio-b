const express = require("express");
const router = express.Router();

const adminGuard = require("../middleware/admin.guard");
const { adminLogin, adminLogout } = require("../controllers/admin.auth.controller");

const {
  createProject,
  getAllProjects,
  deleteProjectById,
  updateProjectById,
  reorderProjects,
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

const {
  getAuditLogs,
  clearAuditLogs,
} = require("../controllers/audit.controller");

const rateLimit = require("express-rate-limit");

// Brute-force protection: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

// 🔓 Login route (guarded by rate limiter)
router.post("/admin/login", loginLimiter, adminLogin);

// 🔐 Protect everything below
router.use("/admin", adminGuard);

router.post("/admin/logout", adminLogout);

// Projects
router.post("/admin/dashboard/projects", createProject);
router.get("/admin/dashboard/projects", getAllProjects);
router.patch("/admin/dashboard/projects/reorder", reorderProjects);
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

// Audit Log
router.get("/admin/audit-log", getAuditLogs);
router.delete("/admin/audit-log", clearAuditLogs);

module.exports = router;
