const Profile = require("../models/profile.model");

exports.getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({}).select("-__v");
    if (!profile) {
      return res.status(200).json(null);
    }
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};
