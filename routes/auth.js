const express = require("express");
const router = express.Router();

const { register } = require("../controller/authController");

// controller
router.get("/register", register);

module.exports = router;
