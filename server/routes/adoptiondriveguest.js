const express = require("express");
const controller = require("../controllers/adoptiondriveguestcontroller");
const { validateid } = require("../utils/validation");
const router = express.Router();
router.param("id", validateid);
router.get("/", controller.getguestalldrives);
router.get("/:id", controller.getguestdrive);
module.exports = { router };
