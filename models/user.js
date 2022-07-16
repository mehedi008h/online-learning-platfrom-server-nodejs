const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema;

const userSchema = new Schema(
    {
        name: {
            type: String,
            trim: true,
            required: [true, "Please Enter your name!"],
        },
        email: {
            type: String,
            trim: true,
            required: [true, "Please Enter your email!"],
            unique: true,
        },
        bio: {
            type: {},
            minlength: [20, "Minimum length of description 20 characters"],
            maxLength: [1000, "Your password cannot exceed 1000 characters"],
        },
        password: {
            type: String,
            required: [true, "Please Enter your password!"],
            minlength: [6, "Your password must be longer than 6 characters"],
            maxLength: [64, "Your password cannot exceed 64 characters"],
        },
        picture: {},
        role: {
            type: [String],
            default: ["Subscriber"],
            enum: ["Subscriber", "Instructor", "Admin"],
        },
        stripe_account_id: "",
        stripe_seller: {},
        stripeSession: {},
        courses: [{ type: ObjectId, ref: "Course" }],
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
