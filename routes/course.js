const express = require("express");
const formidable = require("express-formidable");

const router = express.Router();

// middleware
const { isAuthenticatedUser, isInstructor } = require("../middlewares");

// controllers
const {
    uploadImage,
    removeImage,
    create,
    read,
    uploadVideo,
    removeVideo,
    addLesson,
    update,
    removeLesson,
    updateLesson,
    publishCourse,
    unpublishCourse,
    courses,
} = require("../controller/courseController");

router.get("/courses", courses);

router.post("/course/upload-image", uploadImage);
router.post("/course/remove-image", removeImage);

// course
router.post("/course", isAuthenticatedUser, isInstructor, create);
router.put("/course/:slug", isAuthenticatedUser, update);
router.get("/course/:slug", read);
router.post(
    "/course/video-upload/:instructorId",
    isAuthenticatedUser,
    formidable(),
    uploadVideo
);
router.post(
    "/course/video-remove/:instructorId",
    isAuthenticatedUser,
    removeVideo
);
// `/api/course/lesson/${slug}/${course.instructor._id}`,
router.post(
    "/course/lesson/:slug/:instructorId",
    isAuthenticatedUser,
    addLesson
);

// publish unpublish
router.put("/course/publish/:courseId", isAuthenticatedUser, publishCourse);
router.put("/course/unpublish/:courseId", isAuthenticatedUser, unpublishCourse);

// delete
router.put("/course/:slug/:lessonId", isAuthenticatedUser, removeLesson);
// update
router.put(
    "/course/lesson/:slug/:instructorId",
    isAuthenticatedUser,
    updateLesson
);

module.exports = router;
