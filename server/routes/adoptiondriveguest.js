const express = require("express");
const adoptiondriveguestcontroller = require("../controllers/adoptiondriveguestcontroller");

const router = express.Router();

router.get("/", adoptiondriveguestcontroller.getguestalldrives);

module.exports = {router};
