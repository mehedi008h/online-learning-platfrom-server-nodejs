const express = require("express");

const router = express.Router();

// middleware
const { isAuthenticatedUser, isInstructor } = require("../middlewares");

// controllers
const {
    uploadImage,
    removeImage,
    create,
    read,
} = require("../controller/courseController");

router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);

// course
router.post("/course", isAuthenticatedUser, isInstructor, create);
router.get("/course/:slug", read);

module.exports = router;
