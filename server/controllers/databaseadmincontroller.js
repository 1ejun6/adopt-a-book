const { timingSafeEqual } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");
const supabase = require("../supabase/supabase");
const { errorstatus } = require("../utils/errors");

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
  const databaseurl = process.env.databaseurl;
  if (!databaseurl) {
    return res.status(503).json({
      error: "base endpoint is not configured",
      message: "set databaseurl in .env, then restart server"
    });
  }

  const client = new Client({ connectionString: databaseurl, connectionTimeoutMillis: 10000 });
  let connected = false;
  try {
    const sql = await readFile(path.resolve(__dirname, "../../rawr/base.sql"), "utf8");
    await client.connect();
    connected = true;
    await client.query(sql);
    return res.json({ message: "base sql applied" });
  } catch (error) {
    console.error("base sql failed >", error);
    return res.status(errorstatus(error)).json({
      error: "could not apply base sql",
      ...(["ENOTFOUND", "EHOSTUNREACH", "ENETUNREACH"].includes(error.code) && {
        message: "database host is unreachable; use the supabase session pooler connection string in databaseurl"
      })
    });
  } finally {
    if (connected) {
      await client.end().catch((error) => console.error("base sql disconnect failed >", error));
    }
  }
}

async function seed(req, res) {
  try {
    const { data, error } = await supabase.rpc("seed_demo_data", { selected_customer: null });
    if (error) throw error;
    return res.json({ message: "demo data seeded", result: data });
  } catch (error) {
    console.error("seed_demo_data failed > ", error);
    return res.status(errorstatus(error)).json({
      error: "could not seed demo data",
      ...(error.code === "PGRST202" && { message: "database setup is incomplete" })
    });
  }
}

async function clear(req, res) {
  try {
    const { error } = await supabase.rpc("clear_app_data");
    if (error) throw error;
    return res.json({ message: "application data cleared" });
  } catch (error) {
    console.error("clear_app_data failed > ", error);
    return res.status(errorstatus(error)).json({
      error: "could not clear database",
      ...(error.code === "PGRST202" && { message: "database setup is incomplete" })
    });
  }
}

module.exports = { requirebasetoken, base, seed, clear };
