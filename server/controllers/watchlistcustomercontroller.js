const { errorstatus } = require("../utils/errors");
const watchlistmodel = require("../models/watchlist");
const bookmodel = require("../models/books");
const error_message = "something went wrong on our end > please try again later";

async function index(req, res) {
  try {
    const watchlist = await watchlistmodel.findbyuser(req.user.id);
    return res.json({ watchlist });
  } catch (error) {
    console.error(`[watchlist controller] "index" failed with ${error}`);
    return res.status(errorstatus(error)).json({ error: error_message });
  }
}

async function create(req, res) {
  try {
    const bookid = req.body.bookid;
    if (!bookid) {
      return res.status(400).json({ error: "bookid is required" });
    }
    const book = await bookmodel.getbookbyid(bookid);
    if (!book) return res.status(404).json({ error: "book not found" });
    if (book.status !== "available") return res.status(409).json({ error: "book is no longer available" });
    if (await watchlistmodel.findbybookanduser(bookid, req.user.id)) {
      return res.status(409).json({ error: "book is already in watchlist" });
    }
    const entry = await watchlistmodel.createentry({ userid: req.user.id, bookid: bookid, bookname: book.title, comments: req.body.comments || "" });
    return res.status(201).json({ entry });
  } catch (error) {
    console.error(`[watchlist controller] "create" failed with ${error}`);
    return res.status(errorstatus(error)).json({ error: error_message });
  }
}

async function update(req, res) {
  try {
    if (typeof req.body.comments !== "string") {
      return res.status(400).json({ error: "comments must be a string" });
    }
    const entry = await watchlistmodel.updatecomment(req.params.id, req.user.id, req.body.comments);
    if (!entry) {
      return res.status(404).json({ error: "watchlist entry not found" });
    }
    return res.json({ entry });
  } catch (error) {
    console.error(`[watchlist controller] "update" failed with ${error}`);
    return res.status(errorstatus(error)).json({ error: error_message });
  }
}

async function deleteentry(req, res) {
  try {
    const deleted = await watchlistmodel.deleteentry(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: "watchlist entry not found" });
    }
    return res.status(204).send();
  } catch (error) {
    console.error(`[watchlist controller] "deleteentry" failed with ${error}`);
    return res.status(errorstatus(error)).json({ error: error_message });
  }
}

module.exports = { index, create, update, deleteentry };
