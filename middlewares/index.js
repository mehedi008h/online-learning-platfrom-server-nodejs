const jwt = require("jsonwebtoken");
const User = require("../models/user");
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
