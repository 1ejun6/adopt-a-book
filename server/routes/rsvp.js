const { validateid } = require("../utils/validation");
const express = require("express");
const rsvpcontroller = require("../controllers/rsvpcontroller");
const { authenticated, customer } = require("../middleware");

const router = express.Router();
router.param("id", validateid);

router.post("/drives/rsvp-multiple", authenticated, customer, rsvpcontroller.rsvpmultiple);
router.post("/drives/:id/rsvp", authenticated, customer, rsvpcontroller.rsvpsingle);

module.exports = {router};
