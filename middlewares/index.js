const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Course = require("../models/course");
// Checks if user is authenticated or not
exports.isAuthenticatedUser = async (req, res, next) => {
    const { token } = req.cookies;

    if (!token) {
        return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
};

exports.isInstructor = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        if (!user.role.includes("Instructor")) {
            return res.sendStatus(403);
        } else {
            next();
        }
    } catch (err) {
        console.log(err);
    }
};

exports.isEnrolled = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        const course = await Course.findOne({ slug: req.params.slug }).exec();

        // check if course id is found in user courses array
        let ids = [];
        for (let i = 0; i < user.courses.length; i++) {
            ids.push(user.courses[i].toString());
        }

        if (!ids.includes(course._id.toString())) {
            res.sendStatus(403);
        } else {
            next();
        }
    } catch (err) {
        console.log(err);
    }
};
