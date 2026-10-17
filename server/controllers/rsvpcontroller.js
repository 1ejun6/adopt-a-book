const drives = require("../models/adoptiondrives");
const { errorstatus, errormessage } = require("../utils/errors");

async function rsvpsingle(req, res) {
  try {
    const result = await drives.rsvpdrive(req.params.id, req.user.id);
    if (result.result === "missing") return res.status(404).json({ error: "drive not found" });
    if (!["success", "registered"].includes(result.result)) return res.status(409).json({ error: "drive is closed or cancelled" });
    return res.status(result.result === "success" ? 201 : 200).json({ registered: true });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not register for drive") });
  }
}
async function cancel(req, res) {
  try {
    await drives.cancelrsvp(req.params.id, req.user.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not cancel registration") });
  }
}
module.exports = { rsvpsingle, cancel };
