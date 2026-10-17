const { z } = require("zod");
const stations = require("./mrtstations");
const { readall } = require("./query");
const supabase = require("../supabase/supabase");

const adoptiondriveschema = z.object({
  title: z.string().trim().min(1),
  location: z.string().trim().min(1),
  mrtstationid: z.uuid({ error: "choose an MRT station" }),
  eventdate: z.iso.date(),
  description: z.string().default(""),
  maxcapacity: z.coerce.number().int().positive().max(2147483647),
  userids: z.array(z.string().uuid()).default([]),
  createdby: z.string().uuid(),
  status: z.enum(["open", "closed", "cancelled"]).default("open")
});

const adoptiondriveupdateschema = adoptiondriveschema.omit({ createdby: true, userids: true }).partial().extend({
  description: adoptiondriveschema.shape.description.removeDefault().optional(),
  status: adoptiondriveschema.shape.status.removeDefault().optional()
}).strict().refine((fields) => Object.values(fields).some((value) => value !== undefined), "provide at least one field");

const mapdrive = (row) => (row ? { ...row, _id: row.id } : null);

async function many(query) {
  return (await readall(query)).map(mapdrive);
}
const getalldrives = async () => (await many(supabase.from("adoptiondrives").select(`*,${stations.relation}`).order("eventdate"))).map(row => stations.decorate(row, true));

async function createdrive(drive) {
  const validateddrive = adoptiondriveschema.parse(drive);
  await stations.validatewrite(validateddrive.mrtstationid);
  const { data, error } = await supabase.from("adoptiondrives").insert(validateddrive).select(`*,${stations.relation}`).single();
  if (error) throw error;
  return mapdrive(data);
}
async function getdrivebyid(id) {
  const { data, error } = await supabase.from("adoptiondrives").select(`*,${stations.relation}`).eq("id", id).maybeSingle();
  if (error) throw error;
  return stations.decorate(mapdrive(data), true);
}
async function updatedrive(id, drive) {
  const validateddrive = adoptiondriveupdateschema.parse(drive);
  if (validateddrive.mrtstationid !== undefined) {
    const current = await getdrivebyid(id);
    await stations.validatewrite(validateddrive.mrtstationid, current?.mrtstationid);
  }
  const { data, error } = await supabase.from("adoptiondrives").update(Object.fromEntries(Object.entries(validateddrive).filter(([key]) => Object.hasOwn(drive, key) && drive[key] !== undefined))).eq("id", id).select(`*,${stations.relation}`).maybeSingle();
  if (error) throw error;
  return mapdrive(data);
}
async function rsvpdrive(id, userid) {
  const { data, error } = await supabase.rpc("rsvp_adoption_drive", { drive_id: id, customer_id: userid });
  if (error) throw error;
  return data;
}

const publicfields = `id,title,location,eventdate,description,maxcapacity,status,mrtstationid,${stations.relation}`;
async function publicdrives(id) {
  if (!id) return discovery();
  const query = supabase.from("adoptiondrives").select(publicfields);
  const { data, error } = await query.eq("id", id).maybeSingle();
  if (error) throw error;
  return mapdrive(data);
}
async function removedrives(ids, userid) {
  const { data, error } = await supabase.rpc("remove_drives", { record_ids: ids, actor_id: userid });
  if (error) throw error;
  return data;
}
async function cancelrsvp(id, userid) {
  const { error } = await supabase.rpc("cancel_drive_rsvp", { drive_id: id, customer_id: userid });
  if (error) throw error;
}

const discoveryfilters = z.object({
  mrtstationids: stations.stationids,
  sort: z.enum(["date", "nearest"]).default("date")
});
async function discovery(query = {}, customerid = null) {
  const filters = discoveryfilters.parse(query);
  if (filters.sort === "nearest" && filters.mrtstationids === undefined) throw stations.invalid("nearest sorting requires mrtstationids");
  const { data, error } = await supabase.rpc("browse_drives", {
    station_ids: filters.mrtstationids ?? null, sort_by: filters.sort, customer_id: customerid
  });
  if (error) throw error;
  return data.map(mapdrive);
}

module.exports = { rsvpdrive, adoptiondriveschema, adoptiondriveupdateschema, getalldrives, createdrive, getdrivebyid, updatedrive, publicdrives, removedrives, cancelrsvp, discovery };
