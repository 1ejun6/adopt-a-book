const { timingSafeEqual } = require("node:crypto");
const { errorstatus, errormessage } = require("../utils/errors");
const { runsql } = require("../services/database");

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
    return res.json({ message: "database data and auth users cleared" });
  } catch (error) {
    console.error("clear sql failed >", error);
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not clear database") });
  }
}

async function seed(req, res) {
  try {
    require("../utils/validation").rejectfields(req.body, []);
    const result = await runsql("seed.sql");
    return res.json({ message: "seed applied", result });
  } catch (error) {
    console.error("seed failed >", error);
    return res.status(errorstatus(error)).json({ error: errormessage(error, "could not seed database") });
  }
}

module.exports = { requirebasetoken, base, seed, clear };
