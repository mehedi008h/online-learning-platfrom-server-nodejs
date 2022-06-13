const User = require("../models/user");
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");
const { hashPassword, comparePassword } = require("../utils/auth");

const awsConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    apiVersion: process.env.AWS_API_VERSION,
};

const SES = new AWS.SES(awsConfig);

exports.register = async (req, res) => {
    try {
        // console.log(req.body);
        const { name, email, password } = req.body;
        // validation
        if (!name) return res.status(400).send("Name is required");
        if (!password || password.length < 6) {
            return res
                .status(400)
                .send(
                    "Password is required and should be min 6 characters long"
                );
        }
        let userExist = await User.findOne({ email }).exec();
        if (userExist) return res.status(400).send("Email is taken");

        // hash password
        const hashedPassword = await hashPassword(password);

        // register
        const user = new User({
            name,
            email,
            password: hashedPassword,
        });
        await user.save();
        // console.log("saved user", user);
        return res.json({ ok: true });
    } catch (err) {
        console.log(err);
        return res.status(400).send("Error. Try again.");
    }
};

exports.login = async (req, res) => {
    try {
        // console.log(req.body);
        const { email, password } = req.body;
        // check if our db has user with that email
        const user = await User.findOne({ email }).exec();
        if (!user) return res.status(400).send("No user found");
        // check password
        const match = await comparePassword(password, user.password);
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
                Date.now() +
                    process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
            ),
            httpOnly: true,
        };

        res.status(200).cookie("token", token, options).json({
            success: true,
            token,
            user,
        });
    } catch (err) {
        return res.status(400).send("Error. Try again.");
    }
};

exports.logout = async (req, res) => {
    try {
        res.clearCookie("token");
        return res.json({ message: "Signout success" });
    } catch (err) {}
};

exports.currentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select("-password")
            .exec();

        return res.json(user);
    } catch (err) {
        console.log(err);
    }
};

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
