const express = require("express");
const controller = require("../controllers/databaseadmincontroller");

const router = express.Router();
router.post("/base", controller.requirebasetoken, controller.base);
router.post("/seed/books", controller.requirebasetoken, controller.seedbooks);
router.post("/clear", controller.requirebasetoken, controller.clear);

module.exports = { router };
