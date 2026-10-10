const { errorstatus } = require("../utils/errors");
// appointments

const user = require("../models/users");
const appointment = require("../models/appointments");
const book = require("../models/books");
const adoptionapplication = require("../models/adoptionapplication");

function formatdateforinput(date) {
  if (!date) {
    return "";
  }

  return new Date(date).toISOString().split("T")[0];
}

function createformstate(query = {}) {
  return {
    appointmentdate: query.appointmentdate || "",
    timeslot: query.timeslot || "",
    location: query.location || "",
    bookid: query.bookid || ""
  };
}

function updateformstate(query = {}, appointmentdetails = {}) {
  return {
    appointmentid: appointmentdetails._id
      ? appointmentdetails._id.toString()
      : "",
    appointmentdate:
      query.appointmentdate ||
      formatdateforinput(appointmentdetails.appointmentdate),
    timeslot: query.timeslot || appointmentdetails.timeslot || "",
    location: query.location || appointmentdetails.location || "",
    bookid: query.bookid || appointmentdetails.bookid || ""
  };
}

async function appointments(req, res, id, message = null, error = null) {
  try {
    const account = await user.findcustomerbyid(id);
    if (!account) {
      return res.status(404).json({ error: "customer account not found" });
    }

    const userappointments = await appointment.showappointments(account._id);

    return res.json({
      message,
      error,
      account,
      userappointments
    });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: "error loading your account" });
  }
}

async function createappointmentpage(
  req,
  res,
  id,
  message = null,
  error = null
) {
  try {
    const account = await user.findcustomerbyid(id);
    if (!account) {
      return res.status(404).json({ error: "customer account not found" });
    }

    const approvedapplications = await adoptionapplication.findapprovedbyuser(account._id);
    const booklist = approvedapplications.map((application) => application.bookid).filter((approvedbook) => approvedbook?.status === "reserved");
    const formstate = createformstate();

    return res.json({
      message,
      error,
      account,
      booklist,
      formstate
    });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: "error loading your account" });
  }
}

async function bookappointment(req, res, id, message = null, error = null) {
  try {
    const account = await user.findcustomerbyid(id);
    if (!account) {
      return res.status(404).json({ error: "customer account not found" });
    }

    const appointmentdate = req.body.appointmentdate;
    const timeslot = req.body.timeslot;
    const location = req.body.location;
    const bookid = req.body.bookid || req.body.book;
    if (!bookid) return res.status(400).json({ error: "bookid is required" });
    const selectedbook = await book.getbookbyid(bookid);
    if (!selectedbook) {
      return res.status(404).json({ error: "book not found" });
    }
    const approvedapplication = await adoptionapplication.findbyuserbookwithstatuses(id, bookid, ["approved"]);
    if (!approvedapplication || selectedbook.status !== "reserved") {
      return res.status(409).json({
        error: "an approved application is required for this book"
      });
    }
    let newappointment = {
      userid: id,
      bookid: selectedbook._id,
      booktitle: selectedbook.title,
      location: location,
      appointmentdate: appointmentdate,
      timeslot: timeslot
    };

    await appointment.createappointment(newappointment);

    const userappointments = await appointment.showappointments(account._id);

    return res.status(201).json({
      message,
      error,
      account,
      userappointments
    });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: "error booking appointment" });
  }
}

async function updateappointment(req, res, id, message = null, error = null) {
  try {
    const account = await user.findcustomerbyid(id);
    if (!account) {
      return res.status(404).json({ error: "customer account not found" });
    }
    const appointmentid = req.params.id || req.query.appointmentid;
    if (!appointmentid) return res.status(400).json({ error: "appointmentid is required" });
    const displayappointmentdetails = await appointment.searchappointmentbyid(appointmentid, account._id);
    let appointmentdetails = displayappointmentdetails[0];
    if (!appointmentdetails) {
      return res.status(404).json({ error: "appointment not found" });
    }
    const formstate = updateformstate({}, appointmentdetails);

    return res.json({
      message,
      error,
      appointmentdetails,
      formstate
    });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: "error loading your account" });
  }
}

async function updatingappointment(req, res, id, message = null, error = null) {
  try {
    const account = await user.findcustomerbyid(id);
    if (!account) {
      return res.status(404).json({ error: "customer account not found" });
    }
    const appointmentid = req.params.id || req.body.appointmentid;
    if (!appointmentid) return res.status(400).json({ error: "appointmentid is required" });
    const existingappointments = await appointment.searchappointmentbyid(appointmentid, account._id);
    if (!existingappointments[0]) {
      return res.status(404).json({ error: "appointment not found" });
    }
    if (!["pending confirmation", "appointment confirmed"].includes(existingappointments[0].status)) {
      return res.status(409).json({ error: "only active appointments can be updated" });
    }
    const appointmentdate = req.body.appointmentdate;
    const timeslot = req.body.timeslot;
    const location = req.body.location;

    let updatedappointment = {
      location: location,
      appointmentdate: appointmentdate,
      timeslot: timeslot,
      status: "pending confirmation"
    };

    const result = await appointment.updateappointmentbyid(appointmentid, account._id, updatedappointment);
    if (result.matchedcount === 0) {
      return res.status(409).json({ error: "appointment changed; refresh and try again" });
    }
    const userappointments = await appointment.showappointments(account._id);

    return res.json({
      message,
      error,
      account,
      userappointments
    });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: "error updating appointment" });
  }
}

async function deleteappointment(req, res, id) {
  try {
    const account = await user.findcustomerbyid(id);
    if (!account) {
      return res.status(404).json({ error: "customer account not found" });
    }
    const appointmentid = req.params.id || req.body.appointmentid;
    if (!appointmentid) return res.status(400).json({ error: "appointmentid is required" });
    const targetappointmentlist = await appointment.searchappointmentbyid(appointmentid, account._id);
    const targetappointment = targetappointmentlist[0];
    if (!targetappointment) {
      return res.status(404).json({ error: "appointment not found" });
    }
    if (!["pending confirmation", "appointment confirmed"].includes(targetappointment.status)) {
      return res.status(409).json({ error: "only active appointments can be deleted" });
    }
    const result = await appointment.deleteappointmentbyid(appointmentid, account._id);
    if (result.deletedcount === 0) {
      return res.status(409).json({ error: "appointment changed; refresh and try again" });
    }

    const deleteddate = new Date(targetappointment.appointmentdate).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    return res.status(200).json({ message: `appointment deleted: ${targetappointment.booktitle} (${deleteddate}, ${targetappointment.timeslot})` });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: "error deleting appointment" });
  }
}

async function readappointments(req, res) {
  return appointments(req, res, req.user.id, null, null);
}

async function readcreateappointment(req, res) {
  return createappointmentpage(req, res, req.user.id, null, null);
}

async function createappointment(req, res) {
  return bookappointment(
    req,
    res,
    req.user.id,
    "appointment created successfully",
    null
  );
}

async function readupdateappointment(req, res) {
  return updateappointment(req, res, req.user.id, null, null);
}

async function updatecustomerappointment(req, res) {
  return updatingappointment(
    req,
    res,
    req.user.id,
    "appointment updated successfully",
    null
  );
}

async function deletecustomerappointment(req, res) {
  return deleteappointment(req, res, req.user.id);
}

module.exports = { readappointments, readcreateappointment, createappointment, readupdateappointment, updatecustomerappointment, deletecustomerappointment };
