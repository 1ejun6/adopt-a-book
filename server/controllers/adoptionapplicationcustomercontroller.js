const { errorstatus } = require("../utils/errors");
const adopt = require("../models/adoptionapplication.js");
const bookmodel = require("../models/books.js");

async function hasactiveapplication(userid, bookid) {
  const activeapplication = await adopt.findbyuserbookwithstatuses(userid, bookid, ["pending", "approved"]);
  return Boolean(activeapplication);
}

const getcreateadoptionapplication = async (req, res) => {
  try {
    const bookid = req.params.bookid || req.query.book || null;
    if (!bookid) {
      return res.status(400).json({ error: "please select a book first" });
    }

    const book = await bookmodel.getbookbyid(bookid);
    if (!book) {
      return res.status(404).json({ error: "selected book not found" });
    }
    if (book.status !== "available") {
      return res.status(409).json({ error: "selected book is no longer available for adoption" });
    }
    const userid = req.user.id;
    const existingadoptionapplication = await hasactiveapplication(userid, bookid);
    if (existingadoptionapplication) {
      return res.status(409).json({ error: "you already have a pending or approved adoption application for this book" });
    }

    return res.json({
      bookid: bookid,
      book: book,
      message: null,
      error: null
    });
  } catch (err) {
    console.log(err);
    return res.status(errorstatus(err)).json({ error: "error loading adoption application form" });
  }
};

const createadoptionapplication = async (req, res) => {
  try {
    const userid = req.user.id;
    const bookid = req.body.bookid || req.body.book;
    if (!bookid) {
      return res.status(400).json({ error: "please select a book first" });
    }

    const book = await bookmodel.getbookbyid(bookid);
    if (!book) {
      return res.status(404).json({ error: "selected book not found" });
    }
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
    return res.status(errorstatus(err)).json({ error: "error creating adoption application" });
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
    return res.status(errorstatus(err)).json({ error: "error loading adoption applications" });
  }
};

const handleaction = async (req, res) => {
  const action = req.query.action;
  const aid = req.query.aid;

  if (!aid) {
    const userid = req.user.id;
    const adoptionapplications = await adopt.findbyid(userid);
    return res.status(400).json({
      adoptionapplications,
      message: null,
      error: "please select an adoptionapplication first."
    });
  }

  if (action === "delete") {
    try {
      const deleted = await adopt.deletependingforuser(aid, req.user.id);
      if (!deleted || deleted.deletedcount === 0) {
        return res.status(404).json({ error: "adoption application not found" });
      }
      return res.status(200).json({ message: "adoption application withdrawn successfully" });
    } catch (err) {
      console.log(err);
      return res.status(errorstatus(err)).json({
        error: "error withdrawing adoption application"
      });
    }
  }

  return res.status(400).json({
    error: "invalid action. please use delete."
  });
};

const deleteadoptionapplication = async (req, res) => {
  try {
    const deleted = await adopt.deletependingforuser(req.params.id, req.user.id);
    if (!deleted || deleted.deletedcount === 0) {
      return res.status(404).json({ error: "adoption application not found" });
    }
    return res.status(200).json({ message: "adoption application withdrawn successfully" });
  } catch (err) {
    console.log(err);
    return res.status(errorstatus(err)).json({ error: "error withdrawing adoption application" });
  }
};

module.exports = { getcreateadoptionapplication, createadoptionapplication, readadoptionapplications, handleaction, deleteadoptionapplication };
