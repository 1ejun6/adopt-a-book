const express = require("express");
const controller = require("../controllers/rsvpcontroller");
const { validateid } = require("../utils/validation");
const { authenticated, customer } = require("../middleware");
const router = express.Router();
router.param("id", validateid);
router.post("/drives/:id/rsvp", authenticated, customer, controller.rsvpsingle);
router.delete("/drives/:id/rsvp", authenticated, customer, controller.cancel);
module.exports = { router };
