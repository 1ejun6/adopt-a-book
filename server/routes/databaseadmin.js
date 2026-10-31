const express = require("express");
const controller = require("../controllers/databaseadmincontroller");

const router = express.Router();
router.post("/base", controller.requirebasetoken, controller.base);
router.post("/seed", controller.requirebasetoken, controller.seed);
router.post("/clear", controller.requirebasetoken, controller.clear);

module.exports = { router };
