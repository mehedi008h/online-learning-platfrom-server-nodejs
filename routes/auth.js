const express = require("express");
const router = express.Router();

const {
    register,
    login,
    logout,
    currentUser,
    sendTestEmail,
} = require("../controller/authController");
const { isAuthenticatedUser } = require("../middlewares");

// controller
router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/current-user", isAuthenticatedUser, currentUser);
router.get("/send-email", sendTestEmail);

module.exports = router;
