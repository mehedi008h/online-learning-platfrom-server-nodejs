const express = require("express");

const router = express.Router();

// middleware
const { isAuthenticatedUser } = require("../middlewares");

// controllers
const {
    makeInstructor,
    getAccountStatus,
    currentInstructor,
    instructorCourses,
    studentCount,
    instructorBalance,
    instructorPayoutSettings,
} = require("../controller/instructorController");

router.post("/make-instructor", isAuthenticatedUser, makeInstructor);
router.post("/get-account-status", isAuthenticatedUser, getAccountStatus);
router.get("/current-instructor", isAuthenticatedUser, currentInstructor);

router.get("/instructor-courses", isAuthenticatedUser, instructorCourses);
router.post("/instructor/student-count", isAuthenticatedUser, studentCount);

router.get("/instructor/balance", isAuthenticatedUser, instructorBalance);

router.get(
    "/instructor/payout-settings",
    isAuthenticatedUser,
    instructorPayoutSettings
);

module.exports = router;
