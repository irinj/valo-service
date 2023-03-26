const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { getData } = require("./lib/shop");
const app = express();

const whitelist = ["http://localhost:3000"]; //Cors whitelist

app.set("trust proxy", 1);

let corsOptions = {
  origin: whitelist,
  //origin: "*",
  optionsSuccessStatus: 200,
  credentials: true,
  methods: ["GET", "POST"],
};

app.use(cors(corsOptions)); //Cors

app.use(cookieParser());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

getData();

const storeRoute = require("./routes/store");
app.use(storeRoute);

//404
app.use((_req, res, _next) => {
  res.status(404).send("Content Not Found");
});

const port = 5100;
var server = app.listen(port, function () {
  console.log("Node.js is listening to port", server.address().port);
});
