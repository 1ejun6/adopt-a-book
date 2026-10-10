const { validateid } = require("../utils/validation");
const express = require("express");
const appointmentcustomercontroller = require("../controllers/appointmentcustomercontroller");
const { authenticated, customer } = require("../middleware");

const router = express.Router();
router.param("id", validateid);

router.get("/", authenticated, customer, appointmentcustomercontroller.readappointments);
router.get("/create", authenticated, customer, appointmentcustomercontroller.readcreateappointment);
router.post("/create", authenticated, customer, appointmentcustomercontroller.createappointment);
router.post("/", authenticated, customer, appointmentcustomercontroller.createappointment);
router.get("/update", authenticated, customer, appointmentcustomercontroller.readupdateappointment);
router.post("/update", authenticated, customer, appointmentcustomercontroller.updatecustomerappointment);
router.patch("/:id", authenticated, customer, appointmentcustomercontroller.updatecustomerappointment);
router.post("/delete", authenticated, customer, appointmentcustomercontroller.deletecustomerappointment);
router.delete("/:id", authenticated, customer, appointmentcustomercontroller.deletecustomerappointment);

module.exports = {router};
