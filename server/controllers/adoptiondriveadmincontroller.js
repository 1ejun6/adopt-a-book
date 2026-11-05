const { browse } = require("../models/adminpagination");
const { errorstatus, errormessage } = require("../utils/errors");
const adoptiondrivemodel = require("../models/adoptiondrives");

const getadminalldrives = async (req, res) => {
  try {
    return res.json(await browse("drives", req.query));
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({
      drives: [],
      error: "error loading drives"
    });
  }
};


const createadmindrive = async (req, res) => {
  try {
    require("../utils/validation").rejectfields(req.body, ["bookids", "title", "location", "mrtstationid", "eventdate", "starttime", "endtime", "description", "maxcapacity"]);
    const { bookids, title, location, mrtstationid, eventdate, starttime, endtime, description, maxcapacity } = req.body;

    await adoptiondrivemodel.createdrive({
      bookids,
      title,
      location,
      mrtstationid,
      eventdate,
      starttime,
      endtime,
      description,
      maxcapacity,
      userids: [],
      createdby: req.user.id,
      status: "open"
    });

    return res.status(201).json({ message: "adoption drive created successfully" });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({
      error: errormessage(error, "error creating drive")
    });
  }
};

const getadminupdateform = async (req, res) => {
  try {
    const drive = await adoptiondrivemodel.getdrivebyid(req.params.id);

    if (!drive) {
      return res.status(404).json({ error: "drive not found" });
    }

    return res.json({
      drive,
      error: null
    });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: errormessage(error, "error loading drive") });
  }
};

const updateadmindrive = async (req, res) => {
  try {
    const fields = adoptiondrivemodel.adoptiondriveupdateschema.parse(req.body);
    const drive = await adoptiondrivemodel.updatedrive(req.params.id, fields);

    if (!drive) {
      return res.status(404).json({ error: "drive not found" });
    }

    return res.status(200).json({ message: "adoption drive updated successfully" });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: errormessage(error, "error updating drive") });
  }
};

module.exports = { getadminalldrives, createadmindrive, getadminupdateform, updateadmindrive };
