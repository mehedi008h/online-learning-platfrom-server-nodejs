const AWS = require("aws-sdk");
const { nanoid } = require("nanoid");
const Course = require("../models/course");
const User = require("../models/user");
const Completed = require("../models/completed");
const slugify = require("slugify");
const { readFileSync } = require("fs");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const awsConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    apiVersion: process.env.AWS_API_VERSION,
};

const S3 = new AWS.S3(awsConfig);

// upload image
exports.uploadImage = catchAsyncErrors(async (req, res, next) => {
    const { image } = req.body;
    if (!image) return next(new ErrorHandler("No image!", 400));

    // prepare the image
    const base64Data = new Buffer.from(
        image.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
    );

    const type = image.split(";")[0].split("/")[1];

    // image params
    const params = {
        Bucket: "e-learnbucket",
        Key: `${nanoid()}.${type}`,
        Body: base64Data,
        ACL: "public-read",
        ContentEncoding: "base64",
        ContentType: `image/${type}`,
    };

    // upload to s3
    S3.upload(params, (err, data) => {
        if (err) {
            console.log(err);
            return res.sendStatus(400);
        }

        res.send(data);
    });
});

// remove image
exports.removeImage = catchAsyncErrors(async (req, res) => {
    const { image } = req.body;
    // image params
    const params = {
        Bucket: image.Bucket,
        Key: image.Key,
    };

    // send remove request to s3
    S3.deleteObject(params, (err, data) => {
        if (err) {
            console.log(err);
            res.sendStatus(400);
        }
        res.send({ ok: true });
    });
});

// create course
exports.create = catchAsyncErrors(async (req, res, next) => {
    // checking title
    const alreadyExist = await Course.findOne({
        slug: slugify(req.body.name.toLowerCase()),
    });

    if (alreadyExist)
        return next(new ErrorHandler("Title already taken!", 400));

    const course = await new Course({
        slug: slugify(req.body.name),
        instructor: req.user.id,
        ...req.body,
    }).save();

    res.status(200).json({ course, success: true });
});

// course details => Admin
exports.read = catchAsyncErrors(async (req, res, next) => {
    const course = await Course.findOne({ slug: req.params.slug })
        .populate("instructor", "_id name")
        .exec();
    res.status(200).json(course);
});

// course details => Public
exports.readPublic = catchAsyncErrors(async (req, res) => {
    let course = await Course.findOne({ slug: req.params.slug })
        .populate("instructor", "_id name")
        .exec();

    res.status(200).json(course);
});

// upload video
exports.uploadVideo = catchAsyncErrors(async (req, res, next) => {
    if (req.user.id != req.params.instructorId) {
        return next(new ErrorHandler("Unauthorized", 400));
    }

    const { video } = req.files;

    if (!video) return next(new ErrorHandler("No Video!", 400));

    // video params
    const params = {
        Bucket: "e-learnbucket",
        Key: `${nanoid()}.${video.type.split("/")[1]}`,
        Body: readFileSync(video.path),
        ACL: "public-read",
        ContentType: video.type,
    };

    // upload to s3
    S3.upload(params, (err, data) => {
        if (err) {
            console.log(err);
            res.sendStatus(400);
        }
        console.log(data);
        res.status(200).send(data);
    });
});

// remove video
exports.removeVideo = catchAsyncErrors(async (req, res, next) => {
    if (req.user.id != req.params.instructorId) {
        return next(new ErrorHandler("Unauthorized", 400));
    }

    const { Bucket, Key } = req.body;

    // video params
    const params = {
        Bucket,
        Key,
    };

    // upload to s3
    S3.deleteObject(params, (err, data) => {
        if (err) {
            console.log("Error", err);
            res.sendStatus(400);
        }
        res.send({ ok: true });
    });
});

// add lessone
exports.addLesson = catchAsyncErrors(async (req, res, next) => {
    const { slug, instructorId } = req.params;
    const { title, content, video } = req.body;

    // check instructor is logged in user
    if (req.user.id != instructorId) {
        return next(new ErrorHandler("Unauthorized", 400));
    }

    // update course
    const updated = await Course.findOneAndUpdate(
        { slug },
        {
            $push: {
                lessons: { title, content, video, slug: slugify(title) },
            },
        },
        { new: true }
    )
        .populate("instructor", "_id name")
        .exec();
    res.status(200).json({ updated, success: true });
});

// update course
exports.update = catchAsyncErrors(async (req, res, next) => {
    const { slug } = req.params;

    const course = await Course.findOne({ slug }).exec();

    // checking instructor
    if (req.user.id != course.instructor) {
        return next(new ErrorHandler("Unauthorized", 400));
    }

    // update course
    const updated = await Course.findOneAndUpdate({ slug }, req.body, {
        new: true,
    }).exec();

    res.status(200).json({ updated, success: true });
});

// remove lessone
exports.removeLesson = catchAsyncErrors(async (req, res, next) => {
    const { slug, lessonId } = req.params;

    const course = await Course.findOne({ slug }).exec();
    if (req.user.id != course.instructor) {
        return next(new ErrorHandler("Unauthorized", 400));
    }

    // find lessone for delete video
    const lessone = course.lessons.find((lessone) => lessone._id == lessonId);

    // video params
    const params = {
        Bucket: lessone?.video?.Bucket,
        Key: lessone?.video?.Key,
    };

    try {
        // delete to s3
        S3.deleteObject(params, (err, data) => {
            if (err) {
                console.log("Error", err);
            }
        });
    } catch (error) {
        console.log("Error", error);
    }

    // delete from course
    const deletedCourse = await Course.findByIdAndUpdate(course._id, {
        $pull: { lessons: { _id: lessonId } },
    }).exec();

    res.status(200).json({ success: true });
});

// update lessone
exports.updateLesson = catchAsyncErrors(async (req, res, next) => {
    const { slug } = req.params;
    const { _id, title, content, video, free_preview } = req.body;
    const course = await Course.findOne({ slug }).select("instructor").exec();

    if (course.instructor._id != req.user.id) {
        return next(new ErrorHandler("Unauthorized", 400));
    }

    // update lessone
    const updated = await Course.updateOne(
        { "lessons._id": _id },
        {
            $set: {
                "lessons.$.title": title,
                "lessons.$.content": content,
                "lessons.$.video": video,
                "lessons.$.free_preview": free_preview,
            },
        },
        { new: true }
    ).exec();

    res.status(200).json({ success: true });
});

// publish course
exports.publishCourse = catchAsyncErrors(async (req, res, next) => {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select("instructor").exec();

    // check instructor
    if (course.instructor._id != req.user.id) {
        return next(new ErrorHandler("Unauthorized!", 400));
    }

    // update course
    const update = await Course.findByIdAndUpdate(
        courseId,
        { published: true },
        { new: true }
    ).exec();
    res.status(200).json({ update, message: "Publish Course Successfully." });
});

// unpublish course
exports.unpublishCourse = catchAsyncErrors(async (req, res, next) => {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select("instructor").exec();

    // check instructor
    if (course.instructor._id != req.user.id) {
        return next(new ErrorHandler("Unauthorized!", 400));
    }

    // update course
    const update = await Course.findByIdAndUpdate(
        courseId,
        { published: false },
        { new: true }
    ).exec();
    res.status(200).json({ update, message: "Unpublish Course Successfully." });
});

// get all piblished course
exports.courses = async (req, res) => {
    const all = await Course.find({ published: true })
        .populate("instructor", "_id name")
        .exec();
    res.status(200).json(all);
};

// check enrollment
exports.checkEnrollment = catchAsyncErrors(async (req, res) => {
    const course = await Course.findOne({ slug: req.params.slug }).exec();

    // find courses of the currently logged in user
    const user = await User.findById(req.user.id).exec();

    // check if course id is found in user courses array
    let ids = [];
    let length = user.courses && user.courses.length;
    for (let i = 0; i < length; i++) {
        ids.push(user.courses[i].toString());
    }
    let status = ids.includes((course?._id).toString());
    res.status(200).json({
        status,
        course,
    });
});

// free enrollment
exports.freeEnrollment = catchAsyncErrors(async (req, res, next) => {
    // check if course is free or paid
    const course = await Course.findById(req.params.courseId).exec();

    // check paid or unpaid
    if (course.paid)
        return next(new ErrorHandler("This course is a paid course!"));

    // take course
    const result = await User.findByIdAndUpdate(
        req.user.id,
        {
            $addToSet: { courses: course._id },
        },
        { new: true }
    ).exec();

    res.status(200).json({
        success: true,
        course,
    });
});

// paid enrollment
exports.paidEnrollment = catchAsyncErrors(async (req, res, next) => {
    // check if course is free or paid
    const course = await Course.findById(req.params.courseId)
        .populate("instructor")
        .exec();

    if (!course.paid)
        return next(new ErrorHandler("This course is a free course!"));

    // application fee 30%
    const fee = (course.price * 30) / 100;
    // create stripe session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        // purchase details
        line_items: [
            {
                name: course.name,
                amount: Math.round(course.price.toFixed(2) * 100),
                currency: "usd",
                quantity: 1,
            },
        ],
        // charge buyer and transfer remaining balance to seller (after fee)
        payment_intent_data: {
            application_fee_amount: Math.round(fee.toFixed(2) * 100),
            transfer_data: {
                destination: course.instructor.stripe_account_id,
            },
        },
        // redirect url after successful payment
        success_url: `${process.env.STRIPE_SUCCESS_URL}/${course._id}`,
        cancel_url: process.env.STRIPE_CANCEL_URL,
    });

    await User.findByIdAndUpdate(req.user.id, {
        stripeSession: session,
    }).exec();
    res.status(200).send(session);
});

// stripe success
exports.stripeSuccess = catchAsyncErrors(async (req, res, next) => {
    // find course
    const course = await Course.findById(req.params.courseId).exec();
    // get user from db to get stripe session id
    const user = await User.findById(req.user.id).exec();
    // if no stripe session return
    if (!user.stripeSession.id) return res.sendStatus(400);
    // retrieve stripe session
    const session = await stripe.checkout.sessions.retrieve(
        user.stripeSession.id
    );

    // if session payment status is paid, push course to user's course []
    if (session.payment_status === "paid") {
        await User.findByIdAndUpdate(user._id, {
            $addToSet: { courses: course._id },
            stripeSession: session,
        }).exec();
    }

    res.status(200).json({ success: true, course, session });
});

// user courses
exports.userCourses = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id).exec();
    const courses = await Course.find({ _id: { $in: user.courses } })
        .populate("instructor", "_id name")
        .exec();
    res.status(200).json(courses);
});

// mark complete course
exports.markCompleted = catchAsyncErrors(async (req, res) => {
    const { courseId, lessonId } = req.body;

    // find if user with that course is already created
    const existing = await Completed.findOne({
        user: req.user.id,
        course: courseId,
    }).exec();

    if (existing) {
        // update
        const updated = await Completed.findOneAndUpdate(
            {
                user: req.user.id,
                course: courseId,
            },
            {
                $addToSet: { lessons: lessonId },
            }
        ).exec();
        res.json({ ok: true });
    } else {
        // create
        const created = await new Completed({
            user: req.user.id,
            course: courseId,
            lessons: lessonId,
        }).save();
        res.status(200).json({ ok: true });
    }
});

// completed list
exports.listCompleted = catchAsyncErrors(async (req, res) => {
    const list = await Completed.findOne({
        user: req.user.id,
        course: req.body.courseId,
    }).exec();
    res.status(200).json(list ? list.lessons : [0]);
});

// mark complete
exports.markIncomplete = catchAsyncErrors(async (req, res) => {
    const { courseId, lessonId } = req.body;

    const updated = await Completed.findOneAndUpdate(
        {
            user: req.user.id,
            course: courseId,
        },
        {
            $pull: { lessons: lessonId },
        }
    ).exec();
    res.status(200).json({ ok: true });
});
