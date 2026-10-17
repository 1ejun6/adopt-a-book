const { timingSafeEqual } = require("node:crypto");
const { errorstatus, errormessage } = require("../utils/errors");
const { runsql } = require("../services/database");
const { loadbooks } = require("../seeds/books");

function requirebasetoken(req, res, next) {
  const token = process.env.basetoken;
  if (!token) {
    return res.status(503).json({ error: "database admin endpoints are not configured" });
  }

  const supplied = req.get("x-base-token") || "";
  const expectedbytes = Buffer.from(token);
  const suppliedbytes = Buffer.from(supplied);
  if (expectedbytes.length !== suppliedbytes.length || !timingSafeEqual(expectedbytes, suppliedbytes)) {
    return res.status(401).json({ error: "invalid base token" });
  }
  return next();
}

async function base(req, res) {
  try {
    await runsql("base.sql");
    return res.json({ message: "base sql applied" });
  } catch (error) {
    console.error("base sql failed >", error);
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not apply base sql") });
  }
}

async function clear(req, res) {
  try {
    await runsql("clear.sql");
    return res.json({ message: "application data cleared" });
  } catch (error) {
    console.error("clear sql failed >", error);
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not clear database") });
  }
}

async function seedbooks(req, res) {
  const query = req.body?.q;
  if (query !== undefined && (typeof query !== "string" || !query.trim())) {
    return res.status(400).json({ error: "q must be a non-empty search string" });
  }
  try {
    require("../utils/validation").rejectfields(req.body, ["q", "mrtstationid"]);
    const stationid = require("zod").z.uuid({ error: "choose an MRT station for the imported books" }).parse(req.body?.mrtstationid);
    await require("../models/mrtstations").validatewrite(stationid);
    const books = (await loadbooks(query?.trim())).map(book => ({ ...book, mrtstationid: stationid }));
    const result = await runsql("books.sql", books);
    return res.json({ message: `${result.inserted} books added from Open Library`, result });
  } catch (error) {
    console.error("book seed failed >", error);
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not seed books") });
  }
}

module.exports = { requirebasetoken, base, seedbooks, clear };
