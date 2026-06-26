const Profile = require("../models/profile.model");

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
    const updatedProfile = await Profile.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
    });
    res.status(200).json(updatedProfile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminProfile,
  updateAdminProfile,
};
