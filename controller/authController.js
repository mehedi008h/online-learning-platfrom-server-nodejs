const User = require("../models/user");
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");
const { hashPassword, comparePassword } = require("../utils/auth");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const awsConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    apiVersion: process.env.AWS_API_VERSION,
};

const SES = new AWS.SES(awsConfig);
const S3 = new AWS.S3(awsConfig);

// user register
exports.register = catchAsyncErrors(async (req, res, next) => {
    const { name, email, password } = req.body;

    // validation
    if (!name) return next(new ErrorHandler("Name is required", 400));
    if (!password || password.length < 6) {
        return next(
            new ErrorHandler(
                "Password is required and should be min 6 characters long",
                400
            )
        );
    }
    let userExist = await User.findOne({ email }).exec();
    if (userExist) return next(new ErrorHandler("Email already taken!", 400));

    // hash password
    const hashedPassword = await hashPassword(password);

    // register
    const user = new User({
        name,
        email,
        password: hashedPassword,
    });
    await user.save();

    return res.status(200).json({ ok: true });
});

// user login
exports.login = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    // Checks if email and password is entered by user
    if (!email || !password) {
        return next(new ErrorHandler("Please enter email & password", 400));
    }
    // check if our db has user with that email
    const user = await User.findOne({ email }).exec();
    if (!user) {
        return next(new ErrorHandler("Invalid Email!", 401));
    }
    // check password
    const match = await comparePassword(password, user.password);

    if (!match) {
        return next(new ErrorHandler("Invalid Password!", 401));
    }
    // create signed jwt
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    // return user and token to client, exclude hashed password
    user.password = undefined;
    // send token in cookie
    // Options for cookie
    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
    };

    res.status(200).cookie("token", token, options).json({
        success: true,
        token,
        user,
    });
});

// user logout
exports.logout = catchAsyncErrors(async (req, res, next) => {
    res.clearCookie("token");

    res.status(200).json({
        success: true,
        message: "Logged out",
    });
});

// get currently logged in user
exports.currentUser = catchAsyncErrors(async (req, res) => {
    const user = await User.findById(req.user.id).select("-password").exec();

    res.status(200).json({
        success: true,
        user,
    });
});

// Update user profile   =>   /api/current-user/update
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
    const newUserData = {
        name: req.body.name,
        bio: req.body.bio,
        picture: req.body.picture,
    };

    const newUser = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
    });
});

// Get user details   =>   /api/user/:id
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return next(
            new ErrorHandler(`User does not found with id: ${req.params.id}`)
        );
    }

    res.status(200).json({
        success: true,
        user,
    });
});

exports.sendTestEmail = async (req, res) => {
    // console.log("send email using SES");
    // res.json({ ok: true });
    const params = {
        Source: process.env.EMAIL_FROM,
        Destination: {
            ToAddresses: ["mehedi08h@gmail.com"],
        },
        ReplyToAddresses: [process.env.EMAIL_FROM],
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: `
              <html>
                <h1>Reset password link</h1>
                <p>Please use the following link to reset your password</p>
              </html>
            `,
                },
            },
            Subject: {
                Charset: "UTF-8",
                Data: "Password reset link",
            },
        },
    };

    const emailSent = SES.sendEmail(params).promise();

    emailSent
        .then((data) => {
            console.log(data);
            res.json({ ok: true });
        })
        .catch((err) => {
            console.log(err);
        });
};
