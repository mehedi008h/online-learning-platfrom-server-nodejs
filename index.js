const express = require("express");
const cors = require("cors");
const { readdirSync } = require("fs");
const morgan = require("morgan");
const connectDatabase = require("./config/database");
require("dotenv").config();

// create express app
const app = express();

// connecting to database
connectDatabase();

// apply middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// route
readdirSync("./routes").map((r) => app.use("/api", require(`./routes/${r}`)));

// port
const port = process.env.PORT || 8000;

app.listen(port, () => console.log(`Server is running on port ${port}`));
