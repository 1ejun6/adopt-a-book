const drives = require("../models/adoptiondrives");
const { errorstatus, errormessage } = require("../utils/errors");

async function getguestalldrives(req, res) {
  try {
    return res.json({ drives: await drives.discovery(req.query) });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load drives") });
  }
}
async function getguestdrive(req, res) {
  try {
    const drive = await drives.publicdrives(req.params.id);
    if (!drive) return res.status(404).json({ error: "drive not found" });
    return res.json({ drive });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load drive") });
  }
}
async function getdrivebooks(req, res) {
  try {
    const drive = await drives.publicdrives(req.params.id);
    if (!drive) return res.status(404).json({ error: "drive not found" });
    return res.json({ books: await drives.drivebooks(req.params.id) });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load drive books") });
  }
}
module.exports = { getdrivebooks, getguestalldrives, getguestdrive };
