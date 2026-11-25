const AuditLog = require("../models/auditLog.model");

/**
 * logAudit — helper called inside admin controllers to record every CMS action.
 * @param {string} action  - Verb e.g. "CREATE_PROJECT"
 * @param {string} entity  - "Project" | "Skill" | "Profile"
 * @param {string} entityId   - MongoDB _id of the affected doc (optional)
 * @param {string} entityName - Human label (title / name) of the affected doc
 * @param {object} details    - Any extra payload to store (optional)
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
 * Returns the 100 most-recent audit log entries, newest first.
 */
const getAuditLogs = async (req, res) => {
  try {
    const parsed = parseInt(req.query.limit, 10);
    const limit = Number.isInteger(parsed) ? Math.max(1, Math.min(parsed, 200)) : 50;
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
};

/**
 * DELETE /api/admin/audit-log
 * Clears all audit log entries (super-admin housekeeping).
 */
const clearAuditLogs = async (req, res) => {
  try {
    await AuditLog.deleteMany({});
    await logAudit("CLEAR_AUDIT_LOGS", "AuditLog", null, "Audit log cleared");
    res.json({ message: "Audit log cleared." });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear audit logs" });
  }
};

module.exports = { logAudit, getAuditLogs, clearAuditLogs };
