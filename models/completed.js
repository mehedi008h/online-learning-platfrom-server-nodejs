const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const completedSchema = new mongoose.Schema(
    {
        user: {
            type: ObjectId,
            ref: "User",
        },
        course: {
            type: ObjectId,
            ref: "Course",
        },
        lessons: [],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Completed", completedSchema);
