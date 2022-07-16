const express = require("express");
const router = express.Router();

const {
    register,
    login,
    logout,
    currentUser,
    sendTestEmail,
    updateProfile,
    getUserDetails,
} = require("../controller/authController");
const { isAuthenticatedUser } = require("../middlewares");

// controller
router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/current-user", isAuthenticatedUser, currentUser);
router.put("/current-user/update", isAuthenticatedUser, updateProfile);
router.get("/user/:id", getUserDetails);
router.get("/send-email", sendTestEmail);

module.exports = router;
