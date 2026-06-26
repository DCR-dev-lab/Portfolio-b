const Profile = require("../models/profile.model");

exports.getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({});
    if (!profile) {
      return res.status(200).json(null);
    }
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
