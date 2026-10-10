const { errorstatus } = require("../utils/errors");
const adoptiondrive = require("../models/adoptiondrives");

async function handledriversvp(req, res, driveids) {
  try {
    const userid = req.user.id;

    if (!driveids) {
      return res.status(400).json({ error: "please select at least one drive to rsvp" });
    }

    if (!Array.isArray(driveids)) {
      driveids = [driveids];
    }

    const successdrives = [];
    const alreadyregistereddrives = [];
    const closeddrives = [];
    const cancelleddrives = [];
    const missingdrives = [];

    for (const id of driveids) {
      const drive = await adoptiondrive.rsvpdrive(id, userid);
      if (drive.result === "missing") missingdrives.push(id);
      if (drive.result === "cancelled") cancelleddrives.push(drive.title);
      if (drive.result === "closed") closeddrives.push(drive.title);
      if (drive.result === "registered") alreadyregistereddrives.push(drive.title);
      if (drive.result === "success") successdrives.push(drive.title);
    }

    const resultparts = [];
    if (successdrives.length > 0)
      resultparts.push(`rsvp successful: ${successdrives.join(", ")}`);
    if (alreadyregistereddrives.length > 0)
      resultparts.push(`already rsvped: ${alreadyregistereddrives.join(", ")}`);
    if (closeddrives.length > 0)
      resultparts.push(`closed: ${closeddrives.join(", ")}`);
    if (cancelleddrives.length > 0)
      resultparts.push(`cancelled: ${cancelleddrives.join(", ")}`);
    if (missingdrives.length > 0)
      resultparts.push(`not found: ${missingdrives.join(", ")}`);

    if (resultparts.length === 0) {
      return res.status(400).json({ error: "could not rsvp. please try again." });
    }

    if (successdrives.length === 0) {
      return res.status(missingdrives.length === driveids.length ? 404 : 409).json({ error: resultparts.join(" | ") });
    }
    return res.json({ message: resultparts.join(" | ") });
  } catch (err) {
    console.log("multiple rsvp error:", err);
    return res.status(errorstatus(err)).json({ error: "could not rsvp. please try again." });
  }
}

async function rsvpmultiple(req, res) {
  return handledriversvp(req, res, req.body.driveids);
}

async function rsvpsingle(req, res) {
  return handledriversvp(req, res, req.params.id);
}

module.exports = { rsvpmultiple, rsvpsingle };
