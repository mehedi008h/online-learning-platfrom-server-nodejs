const AWS = require("aws-sdk");
const { nanoid } = require("nanoid");
const Course = require("../models/course");
const slugify = require("slugify");
const { readFileSync } = require("fs");

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
