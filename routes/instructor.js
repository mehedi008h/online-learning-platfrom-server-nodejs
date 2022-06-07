const express = require("express");

const router = express.Router();

// middleware
const { isAuthenticatedUser } = require("../middlewares");

// controllers
const {
    makeInstructor,
    getAccountStatus,
    currentInstructor,
} = require("../controller/instructorController");

router.post("/make-instructor", isAuthenticatedUser, makeInstructor);
router.post("/get-account-status", isAuthenticatedUser, getAccountStatus);
router.get("/current-instructor", isAuthenticatedUser, currentInstructor);

module.exports = router;
