const { errorstatus } = require("../utils/errors");
const book = require("../models/books");
const openlibrary = require("../services/openlibrary");

const search = async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (!query) {
    return res.status(400).json({ error: "search query is required" });
  }

  try {
    const books = await openlibrary.searchbooks(query);
    return res.json({ books });
  } catch (error) {
    console.error(`[open library] search failed: ${error.message}`);
    return res.status(502).json({ error: "open library search unavailable" });
  }
};

const importbook = async (req, res) => {
  try {
    const importedbook = await book.createbook({
      title: req.body.title,
      authors: Array.isArray(req.body.authors) ? req.body.authors : [],
      isbn: req.body.isbn || null,
      subjects: Array.isArray(req.body.subjects) ? req.body.subjects : [],
      publicationyear: req.body.publicationyear || null,
      description: req.body.description || "",
      coverurl: req.body.coverurl || null,
      openlibraryid: req.body.openlibraryid,
      source: "open_library",
      createdby: req.user.id,
      status: "available"
    });
    return res.status(201).json({ book: importedbook });
  } catch (error) {
    console.error(`[open library] import failed: ${error.message}`);
    return res.status(errorstatus(error)).json({ error: "unable to import book" });
  }
};

module.exports = { search, importbook };
