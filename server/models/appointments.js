const { z } = require("zod");
const supabase = require("../supabase/supabase");

const appointmentstatusschema = z.enum([
  "pending confirmation",
  "appointment confirmed",
  "collected",
  "cancelled",
  "rejected"
]);

const appointmentschema = z.object({
  userid: z.string().uuid(),
  bookid: z.string().uuid(),
  booktitle: z.string().trim().min(1),
  location: z.string().trim().min(1),
  appointmentdate: z.iso.date(),
  timeslot: z.string().trim().min(1),
  status: appointmentstatusschema.default("pending confirmation")
});

const appointmentupdateschema = appointmentschema.omit({ userid: true }).partial();

const mapappointment = (row) => (row ? { ...row, _id: row.id } : null);
async function many(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapappointment);
}
const sorted = (query) => many(query.order("appointmentdate", { ascending: false }).order("timeslot", { ascending: false }));

const showappointments = (userid) => sorted(supabase.from("appointments").select("*").eq("userid", userid));
async function createappointment(value) {
  const validatedappointment = appointmentschema.parse(value);
  const { data, error } = await supabase.rpc("book_collection_appointment", { customer_id: validatedappointment.userid, book_id: validatedappointment.bookid, collection_location: validatedappointment.location, collection_date: validatedappointment.appointmentdate, time_slot: validatedappointment.timeslot }).single();
  if (error) throw error;
  return mapappointment(data);
}

const searchappointmentbyid = (id, userid) => many(supabase.from("appointments").select("*").eq("id", id).eq("userid", userid));
async function updateappointmentbyid(id, userid, value) {
  const validatedappointment = appointmentupdateschema.parse(value);
  const { data, error } = await supabase.from("appointments").update(validatedappointment).eq("id", id).eq("userid", userid).in("status", ["pending confirmation", "appointment confirmed"]).select("id");
  if (error) throw error;
  return { matchedcount: data.length, modifiedcount: data.length };
}

async function deleteappointmentbyid(id, userid) {
  const { data, error } = await supabase.from("appointments").delete().eq("id", id).eq("userid", userid).in("status", ["pending confirmation", "appointment confirmed"]).select("id");
  if (error) throw error;
  return { deletedcount: data.length };
}

const listallappointments = () => sorted(supabase.from("appointments").select("*"));
async function confirmappointment(id, status) {
  const validatedstatus = appointmentstatusschema.parse(status);
  const { data, error } = await supabase.from("appointments").update({ status: validatedstatus }).eq("id", id).eq("status", "pending confirmation").select("id");
  if (error) throw error;
  return { matchedcount: data.length, modifiedcount: data.length };
}

async function completecollection(id) {
  const validatedid = z.string().uuid().parse(id);
  const { data, error } = await supabase.rpc("complete_book_collection", { appointment_id: validatedid });
  if (error) throw error;
  return data;
}

const searchappointmentbyuser = showappointments;
const searchappointmentbyuserandstatus = (userid, status) => sorted(supabase.from("appointments").select("*").eq("userid", userid).eq("status", status));

async function searchappointmentsbyusers(userids, status) {
  if (userids.length === 0) return [];
  let query = supabase.from("appointments").select("*").in("userid", userids);
  if (status !== "all") query = query.eq("status", status);
  return sorted(query);
}

module.exports = { searchappointmentsbyusers, appointmentschema, appointmentupdateschema, showappointments, createappointment, searchappointmentbyid, updateappointmentbyid, deleteappointmentbyid, listallappointments, confirmappointment, completecollection, searchappointmentbyuser, searchappointmentbyuserandstatus };
