const { z } = require("zod");
const book = require("../models/books");
const applications = require("../models/adoptionapplication");
const appointments = require("../models/appointments");
const { errorstatus, errormessage } = require("../utils/errors");
const { requestids } = require("../utils/validation");

async function ownedbook(id, userid) {
  const listing = await book.getbookbyid(id);
  if (!listing || listing.ownerid !== userid) throw Object.assign(new Error("listing not found"), { status: 404 });
  return listing;
}

async function index(req, res) {
  try {
    const [listings, requests, collections] = await Promise.all([
      book.ownedbooks(req.user.id), applications.ownerrequests(req.user.id), appointments.ownercollections(req.user.id)
    ]);
    const counts = new Map();
    for (const request of requests) counts.set(request.bookid, (counts.get(request.bookid) || 0) + 1);
    const current = new Map();
    for (const collection of collections) {
      const previous = current.get(collection.bookid);
      const active = ["pending confirmation", "appointment confirmed"].includes(collection.status);
      const previousactive = previous && ["pending confirmation", "appointment confirmed"].includes(previous.status);
      if (!previous || (active && !previousactive) || (active === Boolean(previousactive) && collection.createdat > previous.createdat)) {
        current.set(collection.bookid, collection);
      }
    }
    return res.json({ books: listings.map((listing) => {
      const collection = current.get(listing.id);
      return { ...listing, pendingrequests: counts.get(listing.id) || 0,
        collection: collection ? { id: collection.id, status: collection.status, appointmentdate: collection.appointmentdate, timeslot: collection.timeslot } : null };
    }) });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load your listings") });
  }
}

async function create(req, res) {
  try {
    const fields = book.listingschema.parse(req.body);
    const listing = await book.createbook({ ...fields, ownerid: req.user.id, createdby: req.user.id, source: "manual", status: "available" });
    return res.status(201).json({ book: listing });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "check the title, condition and MRT station") });
  }
}

async function read(req, res) {
  try {
    const listing = await ownedbook(req.params.id, req.user.id);
    return res.json({ book: listing, collections: await appointments.bookcollections(listing.id) });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "listing not found") });
  }
}

async function update(req, res) {
  try {
    const fields = book.listingupdateschema.parse(req.body);
    await ownedbook(req.params.id, req.user.id);
    return res.json({ book: await book.editbook(req.params.id, req.user.id, fields) });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "only your available listings can be edited; check the listing fields") });
  }
}

async function deletebooks(req, res) {
  try {
    const ids = requestids(req);
    return res.json(await book.deletebooks(ids, req.user.id));
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not delete your listings") });
  }
}

async function requests(req, res) {
  try {
    await ownedbook(req.params.id, req.user.id);
    return res.json({ applications: await applications.forbook(req.params.id) });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load listing requests") });
  }
}

async function decide(req, res) {
  try {
    const { status } = z.object({ status: z.enum(["approved", "rejected"]) }).strict().parse(req.body);
    return res.json(await applications.decideapplication(req.params.id, status, req.user.id));
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "only pending requests for your available listings can be decided") });
  }
}

async function collections(req, res) {
  try {
    const [books, collections] = await Promise.all([
      book.ownedbooks(req.user.id), appointments.ownercollections(req.user.id)
    ]);
    const activebookids = new Set(collections.filter((item) => ["pending confirmation", "appointment confirmed"].includes(item.status)).map((item) => item.bookid));
    return res.json({ collections, awaitingproposal: books.filter((item) => item.status === "reserved" && !activebookids.has(item.id)) });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not load handovers") });
  }
}

async function collection(req, res) {
  try {
    const booking = await appointments.findappointment(req.params.id);
    if (!booking) return res.status(404).json({ error: "collection not found" });
    await ownedbook(booking.bookid, req.user.id);
    return res.json({ collection: booking });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "collection not found") });
  }
}

async function updatecollection(req, res) {
  try {
    const fields = z.object({ status: z.enum(["appointment confirmed", "collected"]) }).strict().parse(req.body);
    return res.json({ collection: await appointments.changecollection(req.params.id, req.user.id, fields) });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "collection can only be confirmed, then marked collected, by its owner") });
  }
}

module.exports = { index, create, read, update, deletebooks, requests, decide, collections, collection, updatecollection };
