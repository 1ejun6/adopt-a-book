const { z } = require("zod");
const locations = require("../services/locations");
const { errorstatus } = require("../utils/errors");

const coordinates = {
  lat: z.number().min(1.15).max(1.48),
  lng: z.number().min(103.58).max(104.12)
};

const schema = z.object({
  query: z.string().trim().min(3).max(120)
    .refine(value => !/^\d+$/.test(value) || /^\d{6}$/.test(value), "postcode must contain six digits")
    .optional(),
  lat: coordinates.lat.optional(),
  lng: coordinates.lng.optional(),
  radiusKm: z.number().int().min(1).max(20),
  collections: z.array(z.object({
    id: z.string().min(1).max(100),
    ...coordinates
  }).strict()).max(200).default([])
}).strict().refine(value => {
  if (value.query !== undefined) {
    return value.lat === undefined && value.lng === undefined;
  }
  return value.lat !== undefined && value.lng !== undefined;
}, "provide either a postcode/place query or both latitude and longitude")
  .refine(value => {
    const ids = value.collections.map(point => point.id);
    return new Set(ids).size === ids.length;
  }, "collection IDs must be unique");

const nearby = async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.issues[0].message });
  }

  res.set("Cache-Control", "no-store");
  try {
    const results = await locations.nearby(parsed.data);
    return res.json(results);
  } catch (error) {
    const status = errorstatus(error);
    // Do not log users' postcodes, coordinates, or upstream URLs.
    return res.status(status).json({ error: status === 500 ? "location search unavailable" : error.message });
  }
};

async function stations(req, res) {
  try {
    const query = z.string().trim().max(120).parse(req.query.q ?? "");
    return res.json({ stations: await require("../models/mrtstations").list(query) });
  } catch (error) {
    const status = errorstatus(error);
    return res.status(status).json({ error: status === 422 ? "invalid station search" : "could not load MRT stations" });
  }
}
module.exports = { nearby, stations };
