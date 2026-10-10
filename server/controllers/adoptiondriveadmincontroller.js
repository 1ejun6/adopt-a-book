const { errorstatus } = require("../utils/errors");
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

const getadmincreateform = (req, res) => {
  return res.json({ error: null });
};

const createadmindrive = async (req, res) => {
  try {
    const { title, location, eventdate, description, maxcapacity } = req.body;

    await adoptiondrivemodel.createdrive({
      title,
      location,
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
      error: "error creating drive"
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
    return res.status(errorstatus(error)).json({ error: "error loading drive" });
  }
};

const updateadmindrive = async (req, res) => {
  try {
    const { title, location, eventdate, description, maxcapacity, status } = req.body;

    const drive = await adoptiondrivemodel.updatedrive(req.params.id, {
      title,
      location,
      eventdate,
      description,
      maxcapacity,
      status
    });

    if (!drive) {
      return res.status(404).json({ error: "drive not found" });
    }

    return res.status(200).json({ message: "adoption drive updated successfully" });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: "error updating drive" });
  }
};

const deleteadmindrive = async (req, res) => {
  try {
    const drive = await adoptiondrivemodel.deletedrive(req.params.id);

    if (!drive) {
      return res.status(404).json({ error: "drive not found" });
    }

    return res.status(200).json({ message: "adoption drive deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: "error deleting drive" });
  }
};

module.exports = { getadminalldrives, getadmincreateform, createadmindrive, getadminupdateform, updateadmindrive, deleteadmindrive };
