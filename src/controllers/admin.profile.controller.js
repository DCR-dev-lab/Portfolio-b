const Profile = require("../models/profile.model");
const { logAudit } = require("./audit.controller");
const { deleteCloudinaryImage } = require("../utils/cloudinary");

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
    const newAvatar = req.body?.profilePictureUrl;

    // If avatar was replaced, clean up the old asset in Cloudinary
    if (newAvatar && oldAvatar && newAvatar !== oldAvatar) {
      await deleteCloudinaryImage(oldAvatar);
    }

    const updatedProfile = await Profile.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
    });
    await logAudit("UPDATE_PROFILE", "Profile", updatedProfile._id?.toString(), updatedProfile.fullName);
    res.status(200).json(updatedProfile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminProfile,
  updateAdminProfile,
};
