const express = require("express");
const cors = require("cors");
const { readdirSync } = require("fs");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");
const connectDatabase = require("./config/database");
const errorMiddleware = require("./middlewares/error");
require("dotenv").config();

const csrfProtection = csrf({ cookie: true });

// create express app
const app = express();

// connecting to database
connectDatabase();

// apply middlewares
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// route
readdirSync("./routes").map((r) => app.use("/api", require(`./routes/${r}`)));

// csrf
app.use(csrfProtection);

app.get("/api/csrf-token", (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

app.get("/", (req, res) => {
    res.json("Welcome to Online Developer Learning Platfrom");
});

app.use(express.static(path.join(__dirname, "/client/build")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "/client/build", "index.html"));
});

// Middleware to handle error
app.use(errorMiddleware);
// port
const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server is running on port ${port}`));
