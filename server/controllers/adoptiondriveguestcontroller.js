const { errorstatus } = require("../utils/errors");
const adoptiondrivemodel = require("../models/adoptiondrives");

const getguestalldrives = async (req, res) => {
  try {
    const drives = await adoptiondrivemodel.getalldrivesdescending();
    return res.json({
      drives,
      currentuser: req.user || null
    });
  } catch (err) {
    console.log("error fetching adoption drives:", err);
    return res.status(errorstatus(err)).json({ error: "could not load adoption drives" });
  }
};

module.exports = { getguestalldrives };
