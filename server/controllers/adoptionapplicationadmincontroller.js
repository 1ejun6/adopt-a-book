const { errorstatus } = require("../utils/errors");
const adopt = require("../models/adoptionapplication.js");

const getadminadoptionapplications = async (req, res) => {
  try {
    const adoptionapplications = await adopt.findall();
    return res.json({
      adoptionapplications,
      error: null
    });
  } catch (err) {
    console.log(err);
    return res.status(errorstatus(err)).json({
      adoptionapplications: [],
      error: "error loading adoptionapplications"
    });
  }
};

const getupdateadoptionapplication = async (req, res) => {
  try {
    const paramid = req.params.id;
    const queryid = req.query.aid;

    const id = paramid || queryid;
    if (!id) {
      return res.status(400).json({ error: "application id is required" });
    }
    const adoptionapplication = await adopt.findbyadoptionapplicationid(id);
    if (!adoptionapplication) {
      return res.status(404).json({ error: "adoption application not found" });
    }
    return res.json({
      adoptionapplication,
      error: null
    });
  } catch (err) {
    console.log(err);
    return res.status(errorstatus(err)).json({ error: "error loading adoption application" });
  }
};

const updateadoptionapplication = async (req, res) => {
  try {
    const adoptionapplication = await adopt.findbyadoptionapplicationid(req.params.id);
    if (!adoptionapplication) {
      return res.status(404).json({ error: "adoption application not found" });
    }

    if (adoptionapplication.status !== "pending") {
      return res.status(409).json({ error: "only pending applications can be decided" });
    }

    const status = req.body.status;
    if (status !== "approved" && status !== "rejected") {
      return res.status(400).json({ error: "status must be approved or rejected" });
    }

    const decision = await adopt.decideapplication(req.params.id, status, req.user.id);
    const autorejectedcount = decision.autorejectedcount;

    const message = status === "approved" && autorejectedcount > 0
      ? `adoption application approved. auto-rejected ${autorejectedcount} other pending application(s) for this book`
      : "adoption application status updated successfully";
    return res.json({ message });
  } catch (err) {
    console.log(err);
    return res.status(errorstatus(err)).json({
      error: "error updating adoption application status"
    });
  }
};

module.exports = { getadminadoptionapplications, getupdateadoptionapplication, updateadoptionapplication };
