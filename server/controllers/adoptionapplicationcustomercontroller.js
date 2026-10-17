const { z } = require("zod");
const { requestids } = require("../utils/validation");
const { removecustomerrecords } = require("../models/records");
const { errorstatus, errormessage } = require("../utils/errors");
const adopt = require("../models/adoptionapplication.js");
const bookmodel = require("../models/books.js");

async function hasactiveapplication(userid, bookid) {
  const activeapplication = await adopt.findbyuserbookwithstatuses(userid, bookid, ["pending", "approved"]);
  return Boolean(activeapplication);
}

const createadoptionapplication = async (req, res) => {
  try {
    const userid = req.user.id;
    const { bookid } = z.object({ bookid: z.uuid() }).strict().parse(req.body);
    if (!bookid) {
      return res.status(400).json({ error: "please select a book first" });
    }

    const book = await bookmodel.getbookbyid(bookid);
    if (!book) {
      return res.status(404).json({ error: "selected book not found" });
    }
    if (book.ownerid === userid) return res.status(409).json({ error: "you cannot adopt your own book" });
    if (book.status !== "available") {
      return res.status(409).json({ error: "selected book is no longer available for adoption" });
    }

    const existingadoptionapplication = await hasactiveapplication(userid, bookid);
    if (existingadoptionapplication) {
      return res.status(409).json({ error: "you already have a pending or approved adoption application for this book" });
    }

    const adoptionapplicationdata = { userid, bookid };
    await adopt.addadoptionapplication(adoptionapplicationdata);
    return res.status(201).json({ message: "adoption application submitted successfully" });
  } catch (err) {
    console.log(err);
    return res.status(errorstatus(err)).json({ error: errormessage(err, "error creating adoption application") });
  }
};

const readadoptionapplications = async (req, res) => {
  try {
    const userid = req.user.id;
    const adoptionapplications = await adopt.findbyid(userid);
    return res.json({
      adoptionapplications,
      message: null,
      error: null
    });
  } catch (err) {
    console.log(err);
    return res.status(errorstatus(err)).json({ error: errormessage(err, "error loading adoption applications") });
  }
};

async function readadoptionapplication(req, res) {
  try {
    const adoptionapplication = await adopt.findbyadoptionapplicationid(req.params.id);
    if (!adoptionapplication || adoptionapplication.userid.id !== req.user.id) return res.status(404).json({ error: "application not found" });
    return res.json({ adoptionapplication });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load application") });
  }
}

async function deleteadoptionapplication(req, res) {
  try {
    const ids = requestids(req);
    await removecustomerrecords("applications", ids, req.user.id);
    return res.json({ cancelledids: ids });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "select your pending applications to withdraw") });
  }
}
module.exports = { createadoptionapplication, readadoptionapplications, readadoptionapplication, deleteadoptionapplication };
