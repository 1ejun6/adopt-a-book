const { z } = require("zod");
const supabase = require("../supabase/supabase");

const adoptiondriveschema = z.object({
  title: z.string().trim().min(1),
  location: z.string().trim().min(1),
  eventdate: z.iso.date(),
  description: z.string().default(""),
  maxcapacity: z.coerce.number().int().positive(),
  userids: z.array(z.string().uuid()).default([]),
  createdby: z.string().uuid(),
  status: z.enum(["open", "closed", "cancelled"]).default("open")
});

const adoptiondriveupdateschema = adoptiondriveschema.omit({ createdby: true }).partial();

const mapdrive = (row) => (row ? { ...row, _id: row.id } : null);

async function many(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapdrive);
}
const getalldrives = () => many(supabase.from("adoptiondrives").select("*").order("eventdate"));
const getalldrivesdescending = () => many(supabase.from("adoptiondrives").select("*").order("eventdate", { ascending: false }));

async function createdrive(drive) {
  const validateddrive = adoptiondriveschema.parse(drive);
  const { data, error } = await supabase.from("adoptiondrives").insert(validateddrive).select().single();
  if (error) throw error;
  return mapdrive(data);
}
async function getdrivebyid(id) {
  const { data, error } = await supabase.from("adoptiondrives").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return mapdrive(data);
}
async function updatedrive(id, drive) {
  const validateddrive = adoptiondriveupdateschema.parse(drive);
  const { data, error } = await supabase.from("adoptiondrives").update(Object.fromEntries(Object.entries(validateddrive).filter(([key]) => Object.hasOwn(drive, key) && drive[key] !== undefined))).eq("id", id).select().maybeSingle();
  if (error) throw error;
  return mapdrive(data);
}
async function deletedrive(id) {
  const { data, error } = await supabase.from("adoptiondrives").delete().eq("id", id).select().maybeSingle();
  if (error) throw error;
  return mapdrive(data);
}
async function rsvpdrive(id, userid) {
  const { data, error } = await supabase.rpc("rsvp_adoption_drive", { drive_id: id, customer_id: userid });
  if (error) throw error;
  return data;
}
module.exports = { rsvpdrive, adoptiondriveschema, adoptiondriveupdateschema, getalldrives, getalldrivesdescending, createdrive, getdrivebyid, updatedrive, deletedrive };
