const express = require("express");
const formidable = require("express-formidable");

const router = express.Router();

// middleware
const {
    isAuthenticatedUser,
    isInstructor,
    isEnrolled,
} = require("../middlewares");

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
    readPublic,
    checkEnrollment,
    freeEnrollment,
    paidEnrollment,
    stripeSuccess,
    userCourses,
    markCompleted,
    listCompleted,
    markIncomplete,
} = require("../controller/courseController");

router.get("/courses", courses);
router.get("/course/public/:slug", readPublic);

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

router.get("/check-enrollment/:courseId", isAuthenticatedUser, checkEnrollment);

// enrollment
router.post("/free-enrollment/:courseId", isAuthenticatedUser, freeEnrollment);
router.post("/paid-enrollment/:courseId", isAuthenticatedUser, paidEnrollment);
router.get("/stripe-success/:courseId", isAuthenticatedUser, stripeSuccess);

router.get("/user-courses", isAuthenticatedUser, userCourses);
router.get("/user/course/:slug", isAuthenticatedUser, isEnrolled, read);

// mark completed
router.post("/mark-completed", isAuthenticatedUser, markCompleted);
router.post("/list-completed", isAuthenticatedUser, listCompleted);
router.post("/mark-incomplete", isAuthenticatedUser, markIncomplete);

module.exports = router;
