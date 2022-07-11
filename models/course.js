const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema;

const lessonSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            minlength: [5, "Minimum length of title 5 characters"],
            maxLength: [320, "Your name cannot exceed 320 characters"],
            required: [true, "Please Enter lessone title!"],
        },
        slug: {
            type: String,
            lowercase: true,
        },
        content: {
            type: {},
            minlength: [200, "Minimum length of content 200 characters"],
        },
        video: {},
        free_preview: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const courseSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            minlength: [5, "Minimum length of title 5 characters"],
            maxLength: [320, "Your name cannot exceed 320 characters"],
            required: [true, "Please Enter course name!"],
        },
        slug: {
            type: String,
            lowercase: true,
        },
        description: {
            type: {},
            minlength: [200, "Minimum length of description 200 characters"],
            required: [true, "Please Enter course description!"],
        },
        price: {
            type: Number,
            default: 9.99,
        },
        image: {},
        category: String,
        published: {
            type: Boolean,
            default: false,
        },
        paid: {
            type: Boolean,
            default: true,
        },
        instructor: {
            type: ObjectId,
            ref: "User",
            required: true,
        },
        lessons: [lessonSchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
