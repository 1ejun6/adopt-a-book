const { z } = require("zod");
const { readall } = require("./query");
const supabase = require("../supabase/supabase");

const pickupslots = Array.from({ length: 9 }, (_, i) =>
  `${String(i + 9).padStart(2, "0")}:00–${String(i + 10).padStart(2, "0")}:00`);
const pickupoptionsschema = z.object({
  location: z.string().trim().min(1).max(300),
  appointmentdate: z.iso.date(),
  pickupoptions: z.array(z.object({ appointmentdate: z.iso.date(), timeslot: z.enum(pickupslots) }).strict()).length(3)
}).strict().refine(value => value.pickupoptions.every(option => option.appointmentdate === value.appointmentdate) &&
  new Set(value.pickupoptions.map(option => option.timeslot)).size === 3, "Choose three different times on the same date");
const pickupchoiceschema = z.object({ proposalversion: z.string().uuid(), slot: z.number().int().min(0).max(2) }).strict();

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


const mapappointment = (row) => (row ? { ...row, _id: row.id } : null);
async function many(query) {
  return (await readall(query)).map(mapappointment);
}
const sorted = (query) => many(query.order("appointmentdate", { ascending: false }).order("timeslot", { ascending: false }));

const showappointments = (userid) => sorted(supabase.from("appointments").select("*").eq("userid", userid));
async function createappointment(value) {
  const validatedappointment = pickupoptionsschema.safeExtend({ userid: z.uuid(), bookid: z.uuid() }).parse(value);
  const { data, error } = await supabase.rpc("book_collection_options", { customer_id: validatedappointment.userid, book_id: validatedappointment.bookid, collection_location: validatedappointment.location, collection_date: validatedappointment.appointmentdate, options: validatedappointment.pickupoptions }).single();
  if (error) throw error;
  return mapappointment(data);
}

const listallappointments = async () => (await sorted(supabase.from("appointments")
  .select("*,books!inner(ownerid)").is("books.ownerid", null))).map(row => {
    delete row.books;
    return row;
  });




async function changecollection(id, actorid, changes) {
  const { data, error } = await supabase.rpc("change_collection", { appointment_id: id, actor_id: actorid, changes }).single();
  if (error) throw error;
  return mapappointment(data);
}
const ownercollections = (ownerid) => many(supabase.from("appointments").select("*, books!inner(id,title,authors,coverurl,ownerid,status), users(id,name)").eq("books.ownerid", ownerid).order("appointmentdate"));
async function findappointment(id) {
  const { data, error } = await supabase.from("appointments").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return mapappointment(data);
}

const bookcollections = (bookid) => many(supabase.from("appointments").select("*").eq("bookid", bookid).order("createdat", { ascending: false }));

//@lee-hlmilk > direct admin lookup includes relations > dashboard links do not need the full application list
async function adminappointment(id) {
  const { data, error } = await supabase.from("appointments").select("*, customer:users(name,email), book:books(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data && { ...mapappointment(data), customer: data.customer?.name || "Unknown customer", email: data.customer?.email };
}

module.exports = { pickupoptionsschema, pickupchoiceschema, adminappointment, appointmentschema, showappointments, createappointment, listallappointments, changecollection, ownercollections, findappointment, bookcollections };
