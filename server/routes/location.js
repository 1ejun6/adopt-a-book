const express = require("express");
const controller = require("../controllers/locationcontroller");
const router = express.Router();

router.get("/places", controller.places);
router.get("/stations", controller.stations);
router.post("/nearby", controller.nearby);
module.exports = { router };
