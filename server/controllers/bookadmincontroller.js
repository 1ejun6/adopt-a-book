const { errorstatus, errormessage } = require("../utils/errors");
const book = require("../models/books");
const openlibrary = require("../services/openlibrary");
const { requestids } = require("../utils/validation");

function normalizestringarray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "string" ? item.trim() : item).filter((item) => item !== "");
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return value === undefined ? [] : value;
}

function normalizeoptionalstring(value) {
  return typeof value === "string" ? value.trim() || null : value === undefined ? null : value;
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
    description: body.description === undefined ? "" : body.description,
    coverurl: normalizeoptionalstring(body.coverurl),
    openlibraryid: normalizeoptionalstring(body.openlibraryid),
    condition: body.condition,
    mrtstationid: body.mrtstationid
  };
  return partial
    ? Object.fromEntries(Object.entries(data).filter(([key]) => Object.hasOwn(body, key)))
    : data;
}

const managebook = async (req, res) => {
  try {
    return res.json(await book.inventory(req.query));
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "error loading books") });
  }
};

const createbook = async (req, res) => {
  const formdata = {
    ...buildbookdata(req.body),
    source: req.body.source === undefined ? "manual" : req.body.source,
    ownerid: null,
    createdby: req.user.id,
    status: "available"
  };
  try {
    require("../utils/validation").rejectfields(req.body, ["title", "authors", "isbn", "subjects", "publicationyear", "description", "coverurl", "openlibraryid", "condition", "mrtstationid", "source"]);
    //@1ejun6 > fill missing description on API imports > keep any description entered by admin
    if (formdata.source === "open_library" && formdata.openlibraryid
        && typeof formdata.description === "string" && !formdata.description.trim()) {
      formdata.description = await openlibrary.getdescription(formdata.openlibraryid);
    }
    const created = await book.createbook(formdata);
    return res.status(201).json({
      book: created,
      message: `you have created book ${formdata.title} successfully!`,
      error: null,
      filters: []
    });
  } catch (error) {
    return res.status(errorstatus(error)).json({
      message: null,
      error: errormessage(error, "error creating book"),
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
    return res.status(errorstatus(error)).json({ error: errormessage(error, "error loading book") });
  }
};

const deletebooks = async (req, res) => {
  try {
    const ids = requestids(req);
    return res.json(await book.deletebooks(ids, req.user.id));
  } catch (error) {
    console.error("book deletion failed >", error);
    if (error.code === "PGRST202" || error.code === "42883" || error.code === "42703") {
      return res.status(503).json({ error: "Book deletion needs the latest database setup. Apply /base, then try again." });
    }
    const status = errorstatus(error);
    if ([400, 403, 404, 409, 422].includes(status)) {
      return res.status(status).json({ error: error.message });
    }
    return res.status(errorstatus(error)).json({ error: errormessage(error, "error deleting book(s)!") });
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
    if (Object.hasOwn(req.body, "status")) return res.status(422).json({ error: "status changes use the application or collection endpoints" });
    const allowed = new Set(["title", "authors", "isbn", "subjects", "publicationyear", "description", "coverurl", "openlibraryid", "condition", "mrtstationid"]);
    if (Object.keys(req.body).some((key) => !allowed.has(key))) return res.status(422).json({ error: "unsupported book field" });
    const fields = book.bookupdateschema.parse(formdata);
    const updated = await book.editbook(bookid, req.user.id, Object.fromEntries(Object.entries(fields).filter(([key]) => Object.hasOwn(formdata, key))));
    return res.json({
      book: updated,
      message: `you have updated book ${formdata.title || currentbook.title} successfully!`,
      error: null,
      filters: []
    });
  } catch (error) {
    return res.status(errorstatus(error)).json({
      currentbook: { ...formdata, _id: bookid },
      message: null,
      error: errormessage(error, "error updating book")
    });
  }
};

module.exports = { managebook, createbook, showupdatebook, deletebooks, updatebook };
