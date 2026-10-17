const appointments = require("../models/appointments");
const { removecustomerrecords } = require("../models/records");
const { requestids } = require("../utils/validation");
const { errorstatus, errormessage } = require("../utils/errors");

const proposalschema = appointments.appointmentschema.pick({ bookid: true, location: true, appointmentdate: true, timeslot: true }).strict();

async function readappointments(req, res) {
  try {
    return res.json({ appointments: await appointments.showappointments(req.user.id) });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load appointments") });
  }
}
async function readappointment(req, res) {
  try {
    const appointment = await appointments.findappointment(req.params.id);
    if (!appointment || appointment.userid !== req.user.id) return res.status(404).json({ error: "appointment not found" });
    return res.json({ appointment });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load appointment") });
  }
}
async function createappointment(req, res) {
  try {
    const fields = proposalschema.parse(req.body);
    // The RPC uses the current book title and verifies the approved reader under a book lock.
    const appointment = await appointments.createappointment({ ...fields, userid: req.user.id, booktitle: "collection" });
    return res.status(201).json({ appointment });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "an approved application and a valid collection proposal are required") });
  }
}
async function updatecustomerappointment(req, res) {
  try {
    const fields = proposalschema.omit({ bookid: true }).partial().refine((value) => Object.keys(value).length > 0).parse(req.body);
    return res.json({ appointment: await appointments.changecollection(req.params.id, req.user.id, fields) });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "only your active appointments can be rescheduled") });
  }
}
async function deletecustomerappointment(req, res) {
  try {
    const ids = requestids(req);
    await removecustomerrecords("appointments", ids, req.user.id);
    return res.json({ cancelledids: ids });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "select your active appointments to cancel") });
  }
}
module.exports = { readappointments, readappointment, createappointment, updatecustomerappointment, deletecustomerappointment };
