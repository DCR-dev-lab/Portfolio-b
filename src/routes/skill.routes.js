const express = require('express');
const { getAllSkills } = require('../controllers/skill.controller');
const router = express.Router();

router.get('/skills', getAllSkills);

module.exports = router;