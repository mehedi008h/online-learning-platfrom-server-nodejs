const AWS = require("aws-sdk");
const { nanoid } = require("nanoid");
const Course = require("../models/course");
const User = require("../models/user");
const Completed = require("../models/completed");
const slugify = require("slugify");
const { readFileSync } = require("fs");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const awsConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    apiVersion: process.env.AWS_API_VERSION,
};

const S3 = new AWS.S3(awsConfig);

exports.uploadImage = async (req, res) => {
    // console.log(req.body);
    try {
        const { image } = req.body;
        if (!image) return res.status(400).send("No image");

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
            console.log(data);
            res.send(data);
        });
    } catch (err) {
        console.log(err);
    }
};

exports.removeImage = async (req, res) => {
    try {
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
    } catch (err) {
        console.log(err);
    }
};

exports.create = async (req, res) => {
    // console.log("CREATE COURSE", req.body);
    // return;
    try {
        const alreadyExist = await Course.findOne({
            slug: slugify(req.body.name.toLowerCase()),
        });
        if (alreadyExist) return res.status(400).send("Title is taken");

        const course = await new Course({
            slug: slugify(req.body.name),
            instructor: req.user._id,
            ...req.body,
        }).save();

        res.json(course);
    } catch (err) {
        console.log(err);
        return res.status(400).send("Course create failed. Try again.");
    }
};

exports.read = async (req, res) => {
    try {
        const course = await Course.findOne({ slug: req.params.slug })
            .populate("instructor", "_id name")
            .exec();
        res.json(course);
    } catch (err) {
        console.log(err);
    }
};

exports.readPublic = async (req, res) => {
    // console.log("req.params.slug", req.params.slug);
    try {
        let course = await Course.findOne({ slug: req.params.slug })
            .populate("instructor", "_id name")
            .exec();
        // console.log("COURSE PUBLIC READ => ", course);
        res.json(course);
    } catch (err) {
        console.log(err);
    }
};

exports.uploadVideo = async (req, res) => {
    console.log("Upload");
    try {
        // console.log("req.user._id", req.user._id);
        // console.log("req.params.instructorId", req.params.instructorId);
        if (req.user.id != req.params.instructorId) {
            return res.status(400).send("Unauthorized");
        }

        const { video } = req.files;
        // console.log(video);
        if (!video) return res.status(400).send("No video");

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
            res.send(data);
        });
    } catch (err) {
        console.log(err);
    }
};

exports.removeVideo = async (req, res) => {
    console.log("remove");
    try {
        if (req.user.id != req.params.instructorId) {
            return res.status(400).send("Unauthorized");
        }

        const { Bucket, Key } = req.body;
        console.log("VIDEO REMOVE =====> ", req.body);

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
            console.log("data", data);
            res.send({ ok: true });
        });
    } catch (err) {
        console.log(err);
    }
};

exports.addLesson = async (req, res) => {
    try {
        const { slug, instructorId } = req.params;
        const { title, content, video } = req.body;
        console.log("Info", req.body);

        if (req.user.id != instructorId) {
            return res.status(400).send("Unauthorized");
        }

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
        res.json(updated);
    } catch (err) {
        console.log(err);
        return res.status(400).send("Add lesson failed");
    }
};

exports.update = async (req, res) => {
    try {
        const { slug } = req.params;
        // console.log(slug);
        const course = await Course.findOne({ slug }).exec();
        // console.log("COURSE FOUND => ", course);
        if (req.user.id != course.instructor) {
            return res.status(400).send("Unauthorized");
        }

        const updated = await Course.findOneAndUpdate({ slug }, req.body, {
            new: true,
        }).exec();

        res.json(updated);
    } catch (err) {
        console.log(err);
        return res.status(400).send(err.message);
    }
};

exports.removeLesson = async (req, res) => {
    const { slug, lessonId } = req.params;
    const course = await Course.findOne({ slug }).exec();
    if (req.user.id != course.instructor) {
        return res.status(400).send("Unauthorized");
    }

    const deletedCourse = await Course.findByIdAndUpdate(course._id, {
        $pull: { lessons: { _id: lessonId } },
    }).exec();

    res.json({ ok: true });
};

exports.updateLesson = async (req, res) => {
    try {
        // console.log("UPDATE LESSON", req.body);
        const { slug } = req.params;
        const { _id, title, content, video, free_preview } = req.body;
        const course = await Course.findOne({ slug })
            .select("instructor")
            .exec();

        if (course.instructor._id != req.user.id) {
            return res.status(400).send("Unauthorized");
        }

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
        // console.log("updated", updated);
        res.json({ ok: true });
    } catch (err) {
        console.log(err);
        return res.status(400).send("Update lesson failed");
    }
};

exports.publishCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId)
            .select("instructor")
            .exec();

        if (course.instructor._id != req.user.id) {
            return res.status(400).send("Unauthorized");
        }

        const updated = await Course.findByIdAndUpdate(
            courseId,
            { published: true },
            { new: true }
        ).exec();
        res.json(updated);
    } catch (err) {
        console.log(err);
        return res.status(400).send("Publish course failed");
    }
};

exports.unpublishCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId)
            .select("instructor")
            .exec();

        if (course.instructor._id != req.user.id) {
            return res.status(400).send("Unauthorized");
        }

        const updated = await Course.findByIdAndUpdate(
            courseId,
            { published: false },
            { new: true }
        ).exec();
        res.json(updated);
    } catch (err) {
        console.log(err);
        return res.status(400).send("Unpublish course failed");
    }
};

exports.courses = async (req, res) => {
    const all = await Course.find({ published: true })
        .populate("instructor", "_id name")
        .exec();
    res.json(all);
};

exports.checkEnrollment = async (req, res) => {
    const { courseId } = req.params;
    // find courses of the currently logged in user
    const user = await User.findById(req.user.id).exec();
    // check if course id is found in user courses array
    let ids = [];
    let length = user.courses && user.courses.length;
    for (let i = 0; i < length; i++) {
        ids.push(user.courses[i].toString());
    }
    res.json({
        status: ids.includes(courseId),
        course: await Course.findById(courseId).exec(),
    });
};

exports.freeEnrollment = async (req, res) => {
    try {
        // check if course is free or paid
        const course = await Course.findById(req.params.courseId).exec();
        if (course.paid) return;

        const result = await User.findByIdAndUpdate(
            req.user.id,
            {
                $addToSet: { courses: course._id },
            },
            { new: true }
        ).exec();
        console.log(result);
        res.json({
            message: "Congratulations! You have successfully enrolled",
            course,
        });
    } catch (err) {
        console.log("free enrollment err", err);
        return res.status(400).send("Enrollment create failed");
    }
};

exports.paidEnrollment = async (req, res) => {
    try {
        // check if course is free or paid
        console.log("Id:", req.params.courseId);
        const course = await Course.findById(req.params.courseId)
            .populate("instructor")
            .exec();
        if (!course.paid) return;
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
        console.log("SESSION ID => ", session);

        await User.findByIdAndUpdate(req.user.id, {
            stripeSession: session,
        }).exec();
        res.send(session.id);
    } catch (err) {
        console.log("PAID ENROLLMENT ERR", err);
        return res.status(400).send("Enrollment create failed");
    }
};

exports.stripeSuccess = async (req, res) => {
    try {
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
        console.log("STRIPE SUCCESS", session);
        // if session payment status is paid, push course to user's course []
        if (session.payment_status === "paid") {
            await User.findByIdAndUpdate(user._id, {
                $addToSet: { courses: course._id },
                $set: { stripeSession: {} },
            }).exec();
        }
        res.json({ success: true, course });
    } catch (err) {
        console.log("STRIPE SUCCESS ERR", err);
        res.json({ success: false });
    }
};

exports.userCourses = async (req, res) => {
    const user = await User.findById(req.user.id).exec();
    const courses = await Course.find({ _id: { $in: user.courses } })
        .populate("instructor", "_id name")
        .exec();
    res.json(courses);
};

exports.markCompleted = async (req, res) => {
    const { courseId, lessonId } = req.body;
    // console.log(courseId, lessonId);
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
        res.json({ ok: true });
    }
};

exports.listCompleted = async (req, res) => {
    try {
        const list = await Completed.findOne({
            user: req.user.id,
            course: req.body.courseId,
        }).exec();
        list && res.json(list.lessons);
    } catch (err) {
        console.log(err);
    }
};

exports.markIncomplete = async (req, res) => {
    try {
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
        res.json({ ok: true });
    } catch (err) {
        console.log(err);
    }
};
