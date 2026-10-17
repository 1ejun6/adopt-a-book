const { singaporedate } = require("./dates");
const { z } = require("zod");

function validateid(req, res, next, value, name) {
  if (!z.uuid().safeParse(value).success) {
    return res.status(400).json({ error: "a valid uuid is required" });
  }
  req.params[name] = value.toLowerCase();
  return next();
}

function validaterequest(req, res, next) {
  req.body = req.body || {};
  if (typeof req.body !== "object" || Array.isArray(req.body)) return res.status(400).json({ error: "request body must be an object" });
  const idfields = ["bookid", "book", "aid", "appointmentid", "appointmentids", "driveids"];
  for (const values of [req.body, req.query]) {
    for (const field of idfields) {
      if (values[field] === undefined) continue;
      const schema = field.endsWith("ids") ? z.union([z.uuid(), z.array(z.uuid()).min(1)]) : z.uuid();
      if (!schema.safeParse(values[field]).success) {
        return res.status(400).json({ error: `${field} must contain a valid uuid` });
      }
    }
  }
  for (const field of ["appointmentdate", "eventdate"]) {
    if (req.body[field] !== undefined && !z.iso.date().safeParse(req.body[field]).success) {
      return res.status(422).json({ error: `${field} must be a valid date in yyyy-mm-dd format` });
    }
  }
  if (req.body.appointmentdate && req.body.appointmentdate < singaporedate()) {
    return res.status(422).json({ error: "appointmentdate must be today or later" });
  }
  return next();
}

const idsschema = z.array(z.uuid().transform(value => value.toLowerCase())).min(1).max(100).refine((ids) => new Set(ids).size === ids.length, "ids must be unique");

function requestids(req) {
  const result = idsschema.safeParse(req.params.id || req.params.bookid ? [req.params.id || req.params.bookid] : req.body.ids);
  if (!result.success) throw Object.assign(new Error("provide 1 to 100 distinct valid ids"), { status: 400 });
  return result.data;
}

function rejectfields(body, allowed) {
  if (Object.keys(body).some(key => !allowed.includes(key))) {
    throw Object.assign(new Error("request contains unsupported fields"), { status: 422, field: "body" });
  }
}
module.exports = { validateid, validaterequest, idsschema, requestids, rejectfields };
