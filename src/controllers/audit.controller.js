const AuditLog = require("../models/auditLog.model");
const Project = require("../models/project.model");
const Skill = require("../models/skill.model");
const Profile = require("../models/profile.model");
const { pickFields } = require("../utils/sanitize");
const { computeDiff, extractPreviousValues } = require("../utils/diff");
const { deleteCloudinaryImage } = require("../utils/cloudinary");

const RESTORABLE_PROJECT_FIELDS = [
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

const RESTORABLE_SKILL_FIELDS = [
  "name",
  "proficiency",
  "category",
  "iconKeyword",
];

const REVERTABLE_PROFILE_FIELDS = [
  "fullName",
  "title",
  "shortIntro",
  "profilePictureUrl",
  "resumeUrl",
  "aboutMe",
  "email",
  "phone",
  "location",
  "homeProjectsCount",
  "homeSkillsPerCategory",
];
const REVERTABLE_SOCIAL_FIELDS = ["github", "linkedin", "twitter", "instagram"];

/**
 * logAudit — helper called inside admin controllers to record every CMS action.
 * @param {string} action     - Verb e.g. "CREATE_PROJECT", "LOGIN_FAILED"
 * @param {string} entity     - "Project" | "Skill" | "Profile" | "Security" | "AuditLog"
 * @param {string} entityId   - MongoDB _id of the affected doc (optional)
 * @param {string} entityName - Human label (title / name) of the affected doc
 * @param {object} details    - Optional extra context (diffs, snapshot, previousValues, IP/UA)
 */
const logAudit = async (action, entity, entityId = null, entityName = null, details = null) => {
  try {
    await AuditLog.create({ action, entity, entityId, entityName, details });
  } catch (err) {
    // Audit logging must never crash the main request
    console.error("[AuditLog] Failed to write log:", err.message);
  }
};

/**
 * GET /api/admin/audit-log
 * Returns audit log entries, newest first.
 * When ?paginated=true is passed, returns { logs, hasMore, total } using ?skip= & ?limit=.
 * Otherwise returns a plain array for backward compatibility.
 */
const getAuditLogs = async (req, res) => {
  try {
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isInteger(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 200)) : 50;

    const filter = {};
    if (req.query.entity === "Revert") {
      filter.action = /^REVERT_/;
    } else if (req.query.entity && req.query.entity !== "All") {
      filter.entity = req.query.entity;
    }

    if (req.query.paginated === "true") {
      const parsedSkip = parseInt(req.query.skip, 10);
      const skip = Number.isInteger(parsedSkip) && parsedSkip >= 0 ? parsedSkip : 0;

      const [logs, total] = await Promise.all([
        AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        AuditLog.countDocuments(filter),
      ]);

      return res.json({
        logs,
        hasMore: skip + logs.length < total,
        total,
      });
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(logs);
  } catch (err) {
    console.error("[AuditLog] getAuditLogs error:", err);
    res.status(500).json({ message: err.message || "Failed to fetch audit logs" });
  }
};

/**
 * POST /api/admin/audit-log/:id/restore
 * Restores a deleted Project or Skill from its stored snapshot.
 */
const restoreFromAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await AuditLog.findById(id);

    if (!log) {
      return res.status(404).json({ message: "Audit log entry not found" });
    }

    const snapshot = log.details?.snapshot;
    if (!snapshot || (log.entity !== "Project" && log.entity !== "Skill")) {
      return res.status(400).json({ message: "This log entry does not contain a restorable snapshot" });
    }

    if (log.details?.restoredAt) {
      return res.status(409).json({ message: "This item has already been restored" });
    }

    let restoredDoc;
    if (log.entity === "Project") {
      const safeData = pickFields(snapshot, RESTORABLE_PROJECT_FIELDS);
      restoredDoc = await new Project(safeData).save();
      await logAudit("RESTORE_PROJECT", "Project", restoredDoc._id.toString(), restoredDoc.title, {
        restoredFromLogId: id,
      });
    } else {
      const safeData = pickFields(snapshot, RESTORABLE_SKILL_FIELDS);
      restoredDoc = await new Skill(safeData).save();
      await logAudit("RESTORE_SKILL", "Skill", restoredDoc._id.toString(), restoredDoc.name, {
        restoredFromLogId: id,
      });
    }

    log.details = {
      ...log.details,
      restoredAt: new Date().toISOString(),
      restoredEntityId: restoredDoc._id.toString(),
    };
    log.markModified("details");
    await log.save();

    res.status(201).json({
      message: `${log.entity} restored successfully`,
      restored: restoredDoc,
      log,
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid audit log ID format" });
    }
    res.status(500).json({ message: "Failed to restore item from audit log" });
  }
};

/**
 * POST /api/admin/audit-log/:id/revert
 * Reverts an UPDATE_PROJECT, UPDATE_SKILL, or UPDATE_PROFILE entry using stored previousValues.
 */
const revertFromAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await AuditLog.findById(id);

    if (!log) {
      return res.status(404).json({ message: "Audit log entry not found" });
    }

    const previousValues = log.details?.previousValues;
    const REVERTABLE_ACTIONS = [
      "UPDATE_PROJECT",
      "UPDATE_SKILL",
      "UPDATE_PROFILE",
      "REVERT_PROJECT",
      "REVERT_SKILL",
      "REVERT_PROFILE",
    ];
    if (
      !previousValues ||
      typeof previousValues !== "object" ||
      !REVERTABLE_ACTIONS.includes(log.action)
    ) {
      return res.status(400).json({ message: "This log entry does not support revert" });
    }

    if (log.details?.revertedAt) {
      return res.status(409).json({ message: "This change has already been reverted" });
    }

    let updatedDoc;
    if (log.action.endsWith("_PROJECT")) {
      const target = await Project.findById(log.entityId);
      if (!target) return res.status(404).json({ message: "Project no longer exists" });

      const before = target.toObject();
      const safeRevert = pickFields(previousValues, RESTORABLE_PROJECT_FIELDS);
      Object.assign(target, safeRevert);
      updatedDoc = await target.save();

      const changes = computeDiff(before, updatedDoc.toObject(), RESTORABLE_PROJECT_FIELDS);
      const nextPrevious = changes.length ? extractPreviousValues(before, changes) : null;
      await logAudit("REVERT_PROJECT", "Project", log.entityId, updatedDoc.title, {
        revertedFromLogId: id,
        changes,
        previousValues: nextPrevious,
      });
    } else if (log.action.endsWith("_SKILL")) {
      const target = await Skill.findById(log.entityId);
      if (!target) return res.status(404).json({ message: "Skill no longer exists" });

      const before = target.toObject();
      const safeRevert = pickFields(previousValues, RESTORABLE_SKILL_FIELDS);
      Object.assign(target, safeRevert);
      updatedDoc = await target.save();

      const changes = computeDiff(before, updatedDoc.toObject(), RESTORABLE_SKILL_FIELDS);
      const nextPrevious = changes.length ? extractPreviousValues(before, changes) : null;
      await logAudit("REVERT_SKILL", "Skill", log.entityId, updatedDoc.name, {
        revertedFromLogId: id,
        changes,
        previousValues: nextPrevious,
      });
    } else {
      const target = await Profile.findOne({});
      if (!target) return res.status(404).json({ message: "Profile not found" });

      const before = target.toObject();
      const safeRevert = pickFields(previousValues, REVERTABLE_PROFILE_FIELDS);
      if (previousValues.socialLinks && typeof previousValues.socialLinks === "object") {
        safeRevert.socialLinks = {
          ...(before.socialLinks || {}),
          ...pickFields(previousValues.socialLinks, REVERTABLE_SOCIAL_FIELDS),
        };
      }
      Object.assign(target, safeRevert);
      updatedDoc = await target.save();

      const after = updatedDoc.toObject();
      const changes = [
        ...computeDiff(before, after, REVERTABLE_PROFILE_FIELDS),
        ...computeDiff(before.socialLinks || {}, after.socialLinks || {}, REVERTABLE_SOCIAL_FIELDS).map(
          (c) => ({ ...c, field: `socialLinks.${c.field}` })
        ),
      ];
      const nextPrevious = changes.length
        ? {
            ...extractPreviousValues(before, changes),
            ...(changes.some((c) => c.field.startsWith("socialLinks."))
              ? { socialLinks: extractPreviousValues(before.socialLinks || {}, changes, "socialLinks.") }
              : {}),
          }
        : null;
      await logAudit("REVERT_PROFILE", "Profile", updatedDoc._id?.toString(), updatedDoc.fullName, {
        revertedFromLogId: id,
        changes,
        previousValues: nextPrevious,
      });
    }

    log.details = {
      ...log.details,
      revertedAt: new Date().toISOString(),
    };
    log.markModified("details");
    await log.save();

    res.status(200).json({
      message: `${log.entity} reverted successfully`,
      updated: updatedDoc,
      log,
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    res.status(500).json({ message: "Failed to revert update" });
  }
};

/**
 * DELETE /api/admin/audit-log
 * Clears all audit log entries (super-admin housekeeping).
 */
const clearAuditLogs = async (req, res) => {
  try {
    // Clean up Cloudinary images for any deleted projects that were never restored
    const unrestoredDeletes = await AuditLog.find({
      action: "DELETE_PROJECT",
      "details.restoredAt": { $exists: false },
    }).lean();

    for (const entry of unrestoredDeletes) {
      const snap = entry.details?.snapshot;
      if (!snap) continue;
      const urls = new Set([snap.imageUrl, ...(Array.isArray(snap.images) ? snap.images : [])].filter(Boolean));
      for (const url of urls) {
        await deleteCloudinaryImage(url);
      }
    }

    await AuditLog.deleteMany({});
    await logAudit("CLEAR_AUDIT_LOGS", "AuditLog", null, "Audit log cleared");
    res.json({ message: "Audit log cleared." });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear audit logs" });
  }
};

module.exports = {
  logAudit,
  getAuditLogs,
  restoreFromAuditLog,
  revertFromAuditLog,
  clearAuditLogs,
};
