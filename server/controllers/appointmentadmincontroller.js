const { browse } = require("../models/adminpagination");
const { z } = require("zod");
const appointments = require("../models/appointments");
const books = require("../models/books");
const { errorstatus, errormessage } = require("../utils/errors");

async function readallappointments(req, res) {
  try {
    return res.json(await browse("appointments", req.query));
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load appointments") });
  }
}
async function readappointment(req, res) {
  try {
    const appointment = await appointments.adminappointment(req.params.id);
    const book = appointment && await books.getbookbyid(appointment.bookid);
    if (!book || book.ownerid) return res.status(404).json({ error: "organisation appointment not found" });
    return res.json({ appointment });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load appointment") });
  }
}
async function updateappointment(req, res) {
  try {
    const fields = z.object({ status: z.enum(["appointment confirmed", "rejected", "collected"]) }).strict().parse(req.body);
    return res.json({ appointment: await appointments.changecollection(req.params.id, req.user.id, fields) });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not update organisation appointment") });
  }
}
module.exports = { readallappointments, readappointment, updateappointment };
