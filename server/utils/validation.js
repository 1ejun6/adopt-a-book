const { z } = require("zod");

function validateid(req, res, next, value) {
  if (!z.uuid().safeParse(value).success) {
    return res.status(400).json({ error: "a valid uuid is required" });
  }
  return next();
}

function validaterequest(req, res, next) {
  req.body = req.body || {};
  const idfields = ["bookid", "book", "aid", "appointmentid", "appointmentids", "driveids"];
  for (const values of [req.body, req.query]) {
    for (const field of idfields) {
      if (values[field] === undefined) continue;
      const schema = (field.endsWith("ids") || (values === req.query && field === "bookid" && req.query.action === "delete")) ? z.union([z.uuid(), z.array(z.uuid()).min(1)]) : z.uuid();
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
  if (req.body.appointmentdate && req.body.appointmentdate < new Date().toISOString().slice(0, 10)) {
    return res.status(422).json({ error: "appointmentdate must be today or later" });
  }
  return next();
}

module.exports = { validateid, validaterequest };
