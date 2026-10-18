const { z } = require("zod");
const { requestids } = require("../utils/validation");
const { removecustomerrecords } = require("../models/records");
const { errorstatus, errormessage } = require("../utils/errors");
const watchlistmodel = require("../models/watchlist");
const bookmodel = require("../models/books");
const error_message = "something went wrong on our end > please try again later";

async function index(req, res) {
  try {
    const watchlist = await watchlistmodel.findbyuser(req.user.id);
    return res.json({ watchlist });
  } catch (error) {
    console.error(`[watchlist controller] "index" failed with ${error}`);
    return res.status(errorstatus(error)).json({ error: errormessage(error, error_message) });
  }
}

async function create(req, res) {
  try {
    const { bookid, comments } = z.object({ bookid: z.uuid(), comments: z.string().default("") }).strict().parse(req.body);
    if (!bookid) {
      return res.status(400).json({ error: "bookid is required" });
    }
    const book = await bookmodel.getbookbyid(bookid);
    if (!book) return res.status(404).json({ error: "book not found" });
    if (book.status !== "available") return res.status(409).json({ error: "book is no longer available" });
    if (await watchlistmodel.findbybookanduser(bookid, req.user.id)) {
      return res.status(409).json({ error: "book is already in watchlist" });
    }
    const entry = await watchlistmodel.createentry({ userid: req.user.id, bookid: bookid, bookname: book.title, comments });
    return res.status(201).json({ entry });
  } catch (error) {
    console.error(`[watchlist controller] "create" failed with ${error}`);
    return res.status(errorstatus(error)).json({ error: errormessage(error, error_message) });
  }
}

async function update(req, res) {
  try {
    z.object({ comments: z.string() }).strict().parse(req.body);
    const entry = await watchlistmodel.updatecomment(req.params.id, req.user.id, req.body.comments);
    if (!entry) {
      return res.status(404).json({ error: "watchlist entry not found" });
    }
    return res.json({ entry });
  } catch (error) {
    console.error(`[watchlist controller] "update" failed with ${error}`);
    return res.status(errorstatus(error)).json({ error: errormessage(error, error_message) });
  }
}

async function deleteentry(req, res) {
  try {
    await removecustomerrecords("watchlist", requestids(req), req.user.id);
    return res.status(204).send();
  } catch (error) {
    console.error(`[watchlist controller] "deleteentry" failed with ${error}`);
    return res.status(errorstatus(error)).json({ error: errormessage(error, error_message) });
  }
}

async function read(req, res) {
  try {
    const entry = await watchlistmodel.findentry(req.params.id, req.user.id);
    if (!entry) return res.status(404).json({ error: "watchlist entry not found" });
    return res.json({ entry });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, error_message) });
  }
}
module.exports = { index, create, read, update, deleteentry };
