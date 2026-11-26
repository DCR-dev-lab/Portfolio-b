const Profile = require("../models/profile.model");
const { logAudit } = require("./audit.controller");
const { deleteCloudinaryImage } = require("../utils/cloudinary");
const { pickFields } = require("../utils/sanitize");
const { computeDiff, extractPreviousValues } = require("../utils/diff");

const ALLOWED_PROFILE_FIELDS = [
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
const ALLOWED_SOCIAL_FIELDS = ["github", "linkedin", "twitter", "instagram"];

const getAdminProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({});
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const existingProfile = await Profile.findOne({});
    const oldAvatar = existingProfile?.profilePictureUrl;

    const safePayload = pickFields(req.body, ALLOWED_PROFILE_FIELDS);
    if (req.body?.socialLinks && typeof req.body.socialLinks === "object") {
      safePayload.socialLinks = pickFields(req.body.socialLinks, ALLOWED_SOCIAL_FIELDS);
    }

    const updatedProfile = await Profile.findOneAndUpdate({}, safePayload, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    // Clean up old Cloudinary avatar only AFTER database update succeeds
    const newAvatar = updatedProfile?.profilePictureUrl;
    if (newAvatar && oldAvatar && newAvatar !== oldAvatar) {
      await deleteCloudinaryImage(oldAvatar);
    }

    const beforeDoc = existingProfile ? existingProfile.toObject() : {};
    const afterDoc = updatedProfile.toObject();
    const changes = [
      ...computeDiff(beforeDoc, afterDoc, ALLOWED_PROFILE_FIELDS),
      ...computeDiff(
        beforeDoc.socialLinks || {},
        afterDoc.socialLinks || {},
        ALLOWED_SOCIAL_FIELDS
      ).map((c) => ({ ...c, field: `socialLinks.${c.field}` })),
    ];

    const previousValues = changes.length
      ? {
          ...extractPreviousValues(beforeDoc, changes),
          ...(changes.some((c) => c.field.startsWith("socialLinks."))
            ? { socialLinks: extractPreviousValues(beforeDoc.socialLinks || {}, changes, "socialLinks.") }
            : {}),
        }
      : null;

    await logAudit(
      "UPDATE_PROFILE",
      "Profile",
      updatedProfile._id?.toString(),
      updatedProfile.fullName,
      changes.length ? { changes, previousValues } : null
    );
    res.status(200).json(updatedProfile);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminProfile,
  updateAdminProfile,
};
