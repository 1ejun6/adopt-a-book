const { readall } = require("./query");
const { z } = require("zod");
const supabase = require("../supabase/supabase");
const fields = "id,name,codes,lat,lng,selectable";
const relation = `mrtstation:mrtstations(${fields})`;
const stationids = z.string().transform(value => value === "" ? [] : value.split(",").map(id => id.trim().toLowerCase()))
  .pipe(z.array(z.uuid()).max(500).refine(ids => new Set(ids).size === ids.length, "station IDs must be unique")).optional();
function invalid(message) { return Object.assign(new Error(message), { status: 422, field: "mrtstationid" }); }
async function list(query = "") {
  const data = await readall(supabase.from("mrtstations").select(fields).eq("selectable", true).order("name"));
  const term = query.trim().toLowerCase();
  return data.filter(row => !term || row.name.toLowerCase().includes(term) || row.codes.some(code => code.toLowerCase().includes(term)));
}
async function validatewrite(id, previousid) {
  if (id === undefined) return;
  const { data, error } = await supabase.from("mrtstations").select(fields).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data || (!data.selectable && id.toLowerCase() !== previousid?.toLowerCase())) throw invalid("choose a valid, selectable MRT station");
}
function decorate(row, owner = false) {
  if (!row) return null;
  return { ...row, ...(owner && Object.hasOwn(row, "mrtstationid") ? { needsLocationUpdate: !row.mrtstationid } : {}) };
}
module.exports = { fields, relation, stationids, invalid, list, validatewrite, decorate };
