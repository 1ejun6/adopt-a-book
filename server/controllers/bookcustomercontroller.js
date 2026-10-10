const { errorstatus } = require("../utils/errors");
const book = require("../models/books");

function buildbookfilters(filters) {
  return {
    titlesearch: filters.search || filters.title,
    author: filters.author,
    subject: filters.subject,
    isbn: filters.isbn,
    status: filters.status
  };
}

const readbook = async (req, res) => {
  try {
    const filters = req.query;
    const books = await book.getallbooks({ query: buildbookfilters(filters) });
    return res.json({
      books,
      message: null,
      error: null,
      filters
    });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: "error loading books" });
  }
};

const readbookbyid = async (req, res) => {
  try {
    const selectedbook = await book.getbookbyid(req.params.id);
    if (!selectedbook) {
      return res.status(404).json({ error: "book not found" });
    }
    return res.json({
      book: selectedbook,
      message: null,
      error: null
    });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: "error loading book" });
  }
};

module.exports = { readbook, readbookbyid };
