const { requestids } = require("../utils/validation");
const { errorstatus, errormessage } = require("../utils/errors");
const adoptiondrivemodel = require("../models/adoptiondrives");

const getadminalldrives = async (req, res) => {
  try {
    const drives = await adoptiondrivemodel.getalldrives();

    return res.json({
      drives,
      error: null
    });
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
    require("../utils/validation").rejectfields(req.body, ["title", "location", "mrtstationid", "eventdate", "description", "maxcapacity"]);
    const { title, location, mrtstationid, eventdate, description, maxcapacity } = req.body;

    await adoptiondrivemodel.createdrive({
      title,
      location,
      mrtstationid,
      eventdate,
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

const deleteadmindrive = async (req, res) => {
  try {
    await adoptiondrivemodel.removedrives(requestids(req), req.user.id);
    return res.status(204).send();
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: errormessage(error, "error deleting drive") });
  }
};

module.exports = { getadminalldrives, createadmindrive, getadminupdateform, updateadmindrive, deleteadmindrive };
