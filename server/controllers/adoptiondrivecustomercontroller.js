const drives = require("../models/adoptiondrives");
const { errorstatus, errormessage } = require("../utils/errors");

async function getcustomeralldrives(req, res) {
  try {
    return res.json({ drives: await drives.discovery(req.query, req.user.id) });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load drives") });
  }
}
module.exports = { getcustomeralldrives };
