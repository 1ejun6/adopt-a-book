const express = require("express");
const controller = require("../controllers/bookcustomercontroller");
const { validateid } = require("../utils/validation");
const router = express.Router();
router.param("id", validateid);
router.get("/", controller.readbook);
router.get("/:id", controller.readbookbyid);
module.exports = { router };
