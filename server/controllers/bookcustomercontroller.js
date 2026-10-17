const books = require("../models/books");
const { errorstatus, errormessage } = require("../utils/errors");

async function readbook(req, res) {
  try {
    return res.json(await books.catalogue(req.query));
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load books") });
  }
}
async function readbookbyid(req, res) {
  try {
    const book = await books.publicbooks(req.params.id);
    if (!book) return res.status(404).json({ error: "book not found" });
    return res.json({ book });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load book") });
  }
}
module.exports = { readbook, readbookbyid };
