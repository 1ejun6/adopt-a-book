const { errorstatus } = require("../utils/errors");
const user = require("../models/users");
const appointment = require("../models/appointments");

function formatappointmentdate(date) {
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

async function builduserslist(appointments = []) {
  if (appointments.length === 0) return [];
  const userids = [...new Set(appointments.map((item) => item.userid))];
  const customers = await user.findcustomersbyids(userids);
  const customersbyid = new Map(customers.map((item) => [item.id, item]));
  return appointments.map((item) => {
    const customer = customersbyid.get(item.userid);
    return { name: customer?.name || "unknown user", email: customer?.email || "unknown email" };
  });
}

async function getallappointments(req, res) {
  try {
    const allappointments = await appointment.listallappointments();
    const userslist = await builduserslist(allappointments);
    return res.json({
      allappointments,
      userslist,
      message: null,
      error: null
    });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({
      allappointments: [],
      userslist: [],
      message: null,
      error: "error loading appointments"
    });
  }
}

async function confirmbookings(req, res) {
  try {
    const confirmedappointments = req.body.appointmentids;
    let confirmedappointmentlist = [];
    let message = null;
    let error = null;
    const allappointmentsbeforeupdate = await appointment.listallappointments();
    const appointmentmap = new Map(allappointmentsbeforeupdate.map((a) => [String(a._id), a]));
    const usernamebyid = {};
    const confirmeddetails = [];
    const alreadyconfirmeddetails = [];
    const missingdetails = [];
    const invaliddetails = [];

    if (confirmedappointments && (!Array.isArray(confirmedappointments) || confirmedappointments.length > 0)) {
      if (!Array.isArray(confirmedappointments)) {
        confirmedappointmentlist = [confirmedappointments];
      } else {
        confirmedappointmentlist = confirmedappointments;
      }
      for (const appointmentid of confirmedappointmentlist) {
        const appointmenttoconfirm = appointmentmap.get(String(appointmentid));
        if (!appointmenttoconfirm) {
          missingdetails.push(String(appointmentid));
          continue;
        }

        const userid = String(appointmenttoconfirm.userid);
        if (!usernamebyid[userid]) {
          const appointmentuser = await user.findcustomerbyid(appointmenttoconfirm.userid);
          usernamebyid[userid] = appointmentuser
            ? appointmentuser.name
            : "unknown user";
        }

        const appointmentlabel = `${usernamebyid[userid]} (${appointmenttoconfirm.booktitle}, ${formatappointmentdate(appointmenttoconfirm.appointmentdate)}, ${appointmenttoconfirm.timeslot})`;
        if (appointmenttoconfirm.status === "appointment confirmed") {
          alreadyconfirmeddetails.push(appointmentlabel);
          continue;
        }

        if (appointmenttoconfirm.status !== "pending confirmation") {
          invaliddetails.push(appointmentlabel);
          continue;
        }
        const result = await appointment.confirmappointment(appointmentid, "appointment confirmed");
        if (result.matchedcount === 0) {
          invaliddetails.push(appointmentlabel);
          continue;
        }
        confirmeddetails.push(appointmentlabel);
      }

      const resultparts = [];
      if (invaliddetails.length > 0)
        resultparts.push(`no longer pending: ${invaliddetails.join(", ")}`);
      if (confirmeddetails.length > 0)
        resultparts.push(`confirmed: ${confirmeddetails.join(", ")}`);
      if (alreadyconfirmeddetails.length > 0)
        resultparts.push(`already confirmed: ${alreadyconfirmeddetails.join(", ")}`);
      if (missingdetails.length > 0)
        resultparts.push(`not found: ${missingdetails.join(", ")}`);

      if (confirmeddetails.length > 0) {
        message = resultparts.join(" | ");
      } else {
        error = resultparts.join(" | ");
      }
    } else {
      error = "please select at least one appointment to confirm";
    }

    const allappointments = await appointment.listallappointments();
    const userslist = await builduserslist(allappointments);
    return res.status(error ? (confirmedappointmentlist.length === 0 ? 400 : missingdetails.length === confirmedappointmentlist.length ? 404 : 409) : 200).json({
      allappointments,
      userslist,
      message,
      error
    });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({
      allappointments: [],
      userslist: [],
      message: null,
      error: "error updating appointments"
    });
  }
}

async function searchuser(req, res) {
  try {
    const searchterm = req.query.user || "";
    const statusfilter = req.query.statusfilter || "all";
    const searchedusers = await user.searchcustomerbyname(searchterm);

    const allappointments = await appointment.searchappointmentsbyusers(
      searchedusers.map((item) => item.id), statusfilter
    );

    const userslist = await builduserslist(allappointments);
    let message = null;
    if (allappointments.length === 0) {
      message = "no appointments found for this search";
    } else {
      message = `found ${allappointments.length} appointment(s)`;
    }
    return res.json({
      allappointments,
      userslist,
      message,
      error: null
    });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({
      allappointments: [],
      userslist: [],
      message: null,
      error: "error searching appointments"
    });
  }
}

async function completebookings(req, res) {
  try {
    const requestedids = req.params.id || req.body.appointmentids;
    const appointmentids = Array.isArray(requestedids)
      ? requestedids
      : [requestedids].filter(Boolean);

    if (appointmentids.length === 0) {
      return res.status(400).json({
        allappointments: await appointment.listallappointments(),
        userslist: [],
        message: null,
        error: "please select at least one appointment to complete"
      });
    }

    const allappointments = await appointment.listallappointments();
    const appointmentmap = new Map(allappointments.map((item) => [String(item._id), item]));
    const completed = [];

    for (const appointmentid of appointmentids) {
      const selectedappointment = appointmentmap.get(String(appointmentid));
      if (selectedappointment?.status !== "appointment confirmed") continue;

      const completedtitle = await appointment.completecollection(appointmentid);
      completed.push(completedtitle || selectedappointment.booktitle);
    }

    const refreshedappointments = await appointment.listallappointments();
    return res.status(completed.length > 0 ? 200 : 409).json({
      allappointments: refreshedappointments,
      userslist: await builduserslist(refreshedappointments),
      message:
        completed.length > 0
          ? `collection completed: ${completed.join(", ")}`
          : null,
      error:
        completed.length === 0
          ? "only confirmed appointments can be completed"
          : null
    });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: "error completing collection" });
  }
}

async function readallappointments(req, res) {
  return getallappointments(req, res);
}

async function confirmappointments(req, res) {
  return confirmbookings(req, res);
}

async function searchappointmentsbyuser(req, res) {
  return searchuser(req, res);
}

async function completeappointments(req, res) {
  return completebookings(req, res);
}

module.exports = { readallappointments, confirmappointments, searchappointmentsbyuser, completeappointments };
