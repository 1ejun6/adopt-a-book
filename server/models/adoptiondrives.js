const { z } = require("zod");
const stations = require("./mrtstations");
const { readall } = require("./query");
const supabase = require("../supabase/supabase");

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/, "use HH:MM Singapore time").transform(value => value.slice(0, 5));
const schedule = z.object({ starttime: time, endtime: time }).refine(value => value.endtime > value.starttime, "end time must be after start time");
const adoptiondriveschema = z.object({
  title: z.string().trim().min(1),
  location: z.string().trim().min(1),
  mrtstationid: z.uuid({ error: "choose an MRT station" }),
  eventdate: z.iso.date(),
  starttime: time,
  endtime: time,
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

function mapdrive(row) {
  if (!row) return null;
  const drive = { ...row, _id: row.id };
  delete drive.closedbycapacity;
  return drive;
}

async function many(query) {
  return (await readall(query)).map(mapdrive);
}
const getalldrives = async () => (await many(supabase.from("adoptiondrives").select(`*,${stations.relation}`).order("eventdate"))).map(row => stations.decorate(row, true));

async function createdrive(drive) {
  const validateddrive = adoptiondriveschema.parse(drive);
  schedule.parse(validateddrive);
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
  const existing = await getdrivebyid(id);
  if (!existing) return null;
  // Status-only actions may close/cancel legacy drives; saving schedule/content requires complete times.
  if (Object.keys(drive).some(key => key !== "status")) schedule.parse({ ...existing, ...validateddrive });
  if (validateddrive.mrtstationid !== undefined) {
    await stations.validatewrite(validateddrive.mrtstationid, existing.mrtstationid);
  }
  const changes = Object.fromEntries(Object.entries(validateddrive).filter(([key]) => Object.hasOwn(drive, key) && drive[key] !== undefined));
  // Even setting an already closed drive to closed is an explicit admin choice.
  if (changes.status !== undefined) changes.closedbycapacity = false;
  const { data, error } = await supabase.from("adoptiondrives").update(changes).eq("id", id).select(`*,${stations.relation}`).maybeSingle();
  if (error) throw error;
  return mapdrive(data);
}
async function rsvpdrive(id, userid) {
  const { data, error } = await supabase.rpc("rsvp_adoption_drive", { drive_id: id, customer_id: userid });
  if (error) throw error;
  return data;
}

const publicfields = `id,title,location,eventdate,starttime,endtime,description,maxcapacity,status,mrtstationid,${stations.relation}`;
async function publicdrives(id) {
  if (!id) return discovery();
  // Registration IDs stay on the server; only the remaining count is public.
  const query = supabase.from("adoptiondrives").select(`${publicfields},userids`);
  const { data, error } = await query.eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { userids, ...drive } = data;
  return mapdrive({ ...drive, spotsleft: Math.max(drive.maxcapacity - userids.length, 0) });
}
async function removedrives(ids, userid) {
  const { data, error } = await supabase.rpc("remove_drives", { record_ids: ids, actor_id: userid });
  if (error) throw error;
  return data;
}
async function cancelrsvp(id, userid) {
  const { data, error } = await supabase.rpc("cancel_drive_rsvp", { drive_id: id, customer_id: userid });
  if (error) throw error;
  return data;
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
