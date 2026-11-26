const project = require("../models/project.model");
const { logAudit } = require("./audit.controller");
const { deleteCloudinaryImage } = require("../utils/cloudinary");
const { sortProjects } = require("../utils/sortProjects");
const { pickFields } = require("../utils/sanitize");
const { computeDiff, extractPreviousValues } = require("../utils/diff");

const ALLOWED_PROJECT_FIELDS = [
  "title",
  "shortDescription",
  "longDescription",
  "imageUrl",
  "images",
  "projectUrl",
  "technologies",
  "category",
  "status",
  "type",
  "githubUrl",
  "featured",
  "order",
  "isPublished",
];

// Create a new project

exports.createProject = async (req, res) => {
  try {
    const safePayload = pickFields(req.body, ALLOWED_PROJECT_FIELDS);
    const newProject = new project(safePayload);
    const saveProject = await newProject.save();
    await logAudit("CREATE_PROJECT", "Project", saveProject._id.toString(), saveProject.title);
    res.status(201).json(saveProject);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
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

// Get single project by ID (includes drafts)

exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const found = await project.findById(id);
    if (!found) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json(found);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid project ID format" });
    }
    res.status(500).json({ message: error.message });
  }
};

// Bulk reorder projects by array of IDs

exports.reorderProjects = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { orderedIds } = body;
    if (
      !Array.isArray(orderedIds) ||
      orderedIds.length === 0 ||
      orderedIds.length > 200 ||
      !orderedIds.every((id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id.trim()))
    ) {
      return res.status(400).json({
        message: "orderedIds must be an array of between 1 and 200 valid project IDs",
      });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id.trim() },
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
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
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

    // Note: Cloudinary asset is preserved while the DELETE_PROJECT snapshot exists
    // so one-click Restore works; un-restored images are cleaned up when audit logs are cleared.
    const snapshot = pickFields(deletedProject.toObject(), ALLOWED_PROJECT_FIELDS);
    await logAudit("DELETE_PROJECT", "Project", id, deletedProject.title, { snapshot });
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid project ID format" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
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

    const before = existingProject.toObject();
    const oldImageUrl = existingProject.imageUrl;
    const oldImages = Array.isArray(existingProject.images) ? existingProject.images : [];
    const safePayload = pickFields(req.body, ALLOWED_PROJECT_FIELDS);

    Object.assign(existingProject, safePayload);
    const updatedProject = await existingProject.save();

    // Clean up old Cloudinary assets only AFTER database save succeeds
    const newImageUrl = updatedProject.imageUrl;
    const newImages = Array.isArray(updatedProject.images) ? updatedProject.images : [];
    const retainedSet = new Set([newImageUrl, ...newImages].filter(Boolean));
    const removedUrls = [oldImageUrl, ...oldImages].filter(
      (url) => url && !retainedSet.has(url)
    );
    for (const removedUrl of new Set(removedUrls)) {
      await deleteCloudinaryImage(removedUrl);
    }

    const changes = computeDiff(before, updatedProject.toObject(), ALLOWED_PROJECT_FIELDS);
    const previousValues = changes.length ? extractPreviousValues(before, changes) : null;
    await logAudit(
      "UPDATE_PROJECT",
      "Project",
      id,
      updatedProject.title,
      changes.length ? { changes, previousValues } : null
    );
    res.status(200).json(updatedProject);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid project ID format" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};
