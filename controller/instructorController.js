const User = require("../models/user");
const Course = require("../models/course");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const queryString = require("query-string");

// making Instructor
exports.makeInstructor = catchAsyncErrors(async (req, res, next) => {
    // 1. find user from db
    const user = await User.findById(req.user.id).exec();

    // 2. if user dont have stripe_account_id yet, then create new
    if (!user.stripe_account_id) {
        const account = await stripe.accounts.create({ type: "express" });
        // console.log('ACCOUNT => ', account.id)
        user.stripe_account_id = account.id;
        user.save();
    }
    // 3. create account link based on account id (for frontend to complete onboarding)
    let accountLink = await stripe.accountLinks.create({
        account: user.stripe_account_id,
        refresh_url: process.env.STRIPE_REDIRECT_URL,
        return_url: process.env.STRIPE_REDIRECT_URL,
        type: "account_onboarding",
    });

    // 4. pre-fill any info such as email (optional), then send url resposne to frontend
    accountLink = Object.assign(accountLink, {
        "stripe_user[email]": user.email,
    });

    // 5. then send the account link as response to fronend
    res.send(`${accountLink.url}?${queryString.stringify(accountLink)}`);
});

// get account setting
exports.getAccountStatus = catchAsyncErrors(async (req, res, next) => {
    // find user from db
    const user = await User.findById(req.user.id).exec();
    const account = await stripe.accounts.retrieve(user.stripe_account_id);
    // console.log("ACCOUNT => ", account);
    if (!account.charges_enabled) {
        return next(new ErrorHandler("Unauthorized!", 401));
    } else {
        const statusUpdated = await User.findByIdAndUpdate(
            user.id,
            {
                stripe_seller: account,
                $addToSet: { role: "Instructor" },
            },
            { new: true }
        )
            .select("-password")
            .exec();
        res.json(statusUpdated);
    }
});

// Current Instructor
exports.currentInstructor = catchAsyncErrors(async (req, res, next) => {
    // find user from db
    let user = await User.findById(req.user.id).select("-password").exec();

    // check user role
    if (!user.role.includes("Instructor")) {
        return next(new ErrorHandler("Normal User!", 403));
    } else {
        res.status(200).json({ ok: true });
    }
});

// Instructor Courses
exports.instructorCourses = catchAsyncErrors(async (req, res, next) => {
    const courses = await Course.find({ instructor: req.user.id })
        .sort({ createdAt: -1 })
        .exec();
    res.status(200).json(courses);
});

// course enrolled student count
exports.studentCount = catchAsyncErrors(async (req, res, next) => {
    const users = await User.find({ courses: req.body.courseId })
        .select("_id")
        .exec();
    res.status(200).json(users);
});

// Instructor Balance
exports.instructorBalance = catchAsyncErrors(async (req, res, next) => {
    // find user from db
    let user = await User.findById(req.user.id).exec();

    const balance = await stripe.balance.retrieve({
        stripeAccount: user.stripe_account_id,
    });
    res.status(200).json(balance);
});

// Instructor Payout Settings
exports.instructorPayoutSettings = catchAsyncErrors(async (req, res, next) => {
    // find user from db
    const user = await User.findById(req.user.id).exec();

    // create login link
    const loginLink = await stripe.accounts.createLoginLink(
        user.stripe_seller.id,
        { redirect_url: process.env.STRIPE_SETTINGS_REDIRECT }
    );
    res.json(loginLink.url);
});
