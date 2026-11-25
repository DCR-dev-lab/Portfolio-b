const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      // e.g. "CREATE_PROJECT", "UPDATE_SKILL", "DELETE_PROJECT", "UPDATE_PROFILE"
    },
    entity: {
      type: String,
      required: true,
      enum: ["Project", "Skill", "Profile"],
    },
    entityId: {
      type: String,
      default: null,
    },
    entityName: {
      type: String,
      default: null,
      // Human-readable label: project title, skill name, etc.
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      // Optional extra context (e.g. changed fields)
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
