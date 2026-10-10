const { validateid } = require("../utils/validation");
const express = require("express");
const appointmentadmincontroller = require("../controllers/appointmentadmincontroller");
const { authenticated, admin } = require("../middleware");

const router = express.Router();
router.param("id", validateid);

router.get("/", authenticated, admin, appointmentadmincontroller.readallappointments);
router.post("/", authenticated, admin, appointmentadmincontroller.confirmappointments);
router.post("/complete", authenticated, admin, appointmentadmincontroller.completeappointments);
router.post("/:id/complete", authenticated, admin, appointmentadmincontroller.completeappointments);
router.get("/search", authenticated, admin, appointmentadmincontroller.searchappointmentsbyuser);

module.exports = {router};
