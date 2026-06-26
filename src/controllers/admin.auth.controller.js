const jwt = require("jsonwebtoken");

const adminLogin = (req, res) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ message: "Admin key required" });
  }

  if (key !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ message: "Invalid admin key" });
  }

  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "30m",
  });

  res.status(200).json({ token });
};

module.exports = { adminLogin };
