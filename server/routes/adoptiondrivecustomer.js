const express = require("express");
const adoptiondrivecustomercontroller = require("../controllers/adoptiondrivecustomercontroller");
const { authenticated, customer } = require("../authmiddleware");

const router = express.Router();

router.get("/", authenticated, customer, adoptiondrivecustomercontroller.getcustomeralldrives);

module.exports = {router};
