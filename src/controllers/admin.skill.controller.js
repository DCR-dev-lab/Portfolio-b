const Skill = require("../models/skill.model");
const { logAudit } = require("./audit.controller");
const { pickFields } = require("../utils/sanitize");
const { computeDiff, extractPreviousValues } = require("../utils/diff");

const ALLOWED_SKILL_FIELDS = ["name", "proficiency", "category", "iconKeyword"];

const createSkill = async (req, res) => {
  try {
    const safePayload = pickFields(req.body, ALLOWED_SKILL_FIELDS);
    const newSkill = new Skill(safePayload);
    const savedSkill = await newSkill.save();
    await logAudit("CREATE_SKILL", "Skill", savedSkill._id.toString(), savedSkill.name);
    res.status(201).json(savedSkill);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

const getAllSkills = async (req, res) => {
  try {
    const skills = await Skill.find({});
    res.status(200).json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSkillById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSkill = await Skill.findByIdAndDelete(id);
    if (!deletedSkill) {
      return res.status(404).json({ message: "Skill not found" });
    }
    const snapshot = pickFields(deletedSkill.toObject(), ALLOWED_SKILL_FIELDS);
    await logAudit("DELETE_SKILL", "Skill", id, deletedSkill.name, { snapshot });
    res.status(200).json({ message: "Skill deleted successfully" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid skill ID format" });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateSkillById = async (req, res) => {
  try {
    const { id } = req.params;
    const existingSkill = await Skill.findById(id);
    if (!existingSkill) {
      return res.status(404).json({ message: "Skill not found" });
    }

    const before = existingSkill.toObject();
    const safePayload = pickFields(req.body, ALLOWED_SKILL_FIELDS);

    Object.assign(existingSkill, safePayload);
    const updatedSkill = await existingSkill.save();

    const changes = computeDiff(before, updatedSkill.toObject(), ALLOWED_SKILL_FIELDS);
    const previousValues = changes.length ? extractPreviousValues(before, changes) : null;
    await logAudit(
      "UPDATE_SKILL",
      "Skill",
      id,
      updatedSkill.name,
      changes.length ? { changes, previousValues } : null
    );
    res.status(200).json(updatedSkill);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid skill ID format" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSkill,
  getAllSkills,
  deleteSkillById,
  updateSkillById,
};
