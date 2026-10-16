const { errorstatus } = require("../utils/errors");
const book = require("../models/books");
const { z } = require("zod");

function normalizestringarray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "string" ? item.trim() : item).filter((item) => item !== "");
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeoptionalstring(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildbookdata(body, partial = false) {
  const data = {
    title: body.title,
    authors: normalizestringarray(body.authors),
    isbn: normalizeoptionalstring(body.isbn),
    subjects: normalizestringarray(body.subjects),
    publicationyear:
      body.publicationyear === "" || body.publicationyear == null
        ? null
        : Number(body.publicationyear),
    description: body.description || "",
    coverurl: normalizeoptionalstring(body.coverurl),
    openlibraryid: normalizeoptionalstring(body.openlibraryid),
    status: body.status || "available"
  };
  return partial
    ? Object.fromEntries(Object.entries(data).filter(([key]) => Object.hasOwn(body, key)))
    : data;
}

function buildbookfilters(filters) {
  return {
    titlesearch: filters.search || filters.title,
    author: filters.author,
    subject: filters.subject,
    isbn: filters.isbn,
    status: filters.status
  };
}

const managebook = async (req, res) => {
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

const displaycreatebook = (req, res) => {
  return res.json({
    formdata: {},
    message: null,
    error: null,
    filters: []
  });
};

const createbook = async (req, res) => {
  const formdata = {
    ...buildbookdata(req.body),
    source: "manual",
    createdby: req.user.id
  };
  try {
    await book.createbook(formdata);
    const books = await book.getallbooks();
    return res.status(201).json({
      books,
      message: `you have created book ${formdata.title} successfully!`,
      error: null,
      filters: []
    });
  } catch (error) {
    return res.status(errorstatus(error)).json({
      message: null,
      error: "error creating book",
      filters: [],
      formdata
    });
  }
};

const showupdatebook = async (req, res) => {
  const bookid = req.params.bookid;
  if (!bookid) {
    return res.status(400).json({ error: "please select a book!" });
  }
  try {
    const currentbook = await book.getbookbyid(bookid);
    if (!currentbook) {
      return res.status(404).json({ error: "book not found" });
    }
    return res.json({
      currentbook,
      message: null,
      error: null
    });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: "error loading book" });
  }
};

const deletebooks = async (req, res) => {
  try {
    const input = req.params.bookid ? [req.params.bookid] : req.body?.bookids;
    if (!z.array(z.uuid()).min(1).safeParse(input).success) {
      return res.status(400).json({ error: "select at least one book with a valid uuid to delete!" });
    }
    const bookids = [...new Set(input)];

    const bookstodelete = await book.getbooksbyids(bookids);
    if (bookstodelete.length !== bookids.length) return res.status(404).json({ error: "one or more books not found" });
    const booktitles = bookstodelete.map((item) => item.title);
    await book.deletebooksbyids(bookids);

    return res.json({
      deletedids: bookids,
      message: `you have deleted ${booktitles.join(", ")} successfully!`,
      error: null,
      filters: []
    });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: "error deleting book(s)!" });
  }
};

const updatebook = async (req, res) => {
  const bookid = req.params.bookid;
  const formdata = buildbookdata(req.body, true);
  try {
    const currentbook = await book.getbookbyid(bookid);
    if (!currentbook) {
      return res.status(404).json({ error: "book not found" });
    }
    await book.updatebook(bookid, formdata);
    const books = await book.getallbooks();
    return res.json({
      books,
      message: `you have updated book ${formdata.title || currentbook.title} successfully!`,
      error: null,
      filters: []
    });
  } catch (error) {
    return res.status(errorstatus(error)).json({
      currentbook: { ...formdata, _id: bookid },
      message: null,
      error: "error updating book"
    });
  }
};

module.exports = { managebook, displaycreatebook, createbook, showupdatebook, deletebooks, updatebook };
