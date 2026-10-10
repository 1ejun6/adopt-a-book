const { z } = require("zod");
const supabase = require("../supabase/supabase");

const applicationstatusschema = z.enum(["pending", "approved", "rejected"]);
const adoptionapplicationschema = z.object({
  userid: z.string().uuid(),
  bookid: z.string().uuid(),
  status: applicationstatusschema.default("pending")
});

const mapapplication = (row) => (row ? { ...row, _id: row.id } : null);

async function many(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapapplication);
}

async function one(query) {
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return mapapplication(data);
}

const selectwithrelations = "*, userid:users(*), bookid:books(*)";

async function addadoptionapplication(value) {
  const validatedapplication = adoptionapplicationschema.parse(value);
  const { data, error } = await supabase.from("adoptionapplications").insert(validatedapplication).select().single();
  if (error) throw error;
  return mapapplication(data);
}

const findbyid = (userid) => many(supabase.from("adoptionapplications").select(selectwithrelations).eq("userid", userid));

const findall = () => many(supabase.from("adoptionapplications").select(selectwithrelations));

const findbyadoptionapplicationid = (id) => one(supabase.from("adoptionapplications").select(selectwithrelations).eq("id", id));

const findbyuserbookwithstatuses = (userid, bookid, statuses) => one(supabase.from("adoptionapplications").select("*").eq("userid", userid).eq("bookid", bookid).in("status", statuses));

const findapprovedbyuser = (userid) => many(supabase.from("adoptionapplications").select(selectwithrelations).eq("userid", userid).eq("status", "approved"));

async function decideapplication(id, status, decidedby) {
  const validatedstatus = z.enum(["approved", "rejected"]).parse(status);
  const validatedadminid = z.string().uuid().parse(decidedby);
  const validatedid = z.string().uuid().parse(id);
  const { data, error } = await supabase.rpc("decide_book_application", { application_id: validatedid, admin_id: validatedadminid, decision: validatedstatus });
  if (error) throw error;
  return { autorejectedcount: Number(data) || 0 };
}

async function deletependingforuser(id, userid) {
  const { data, error } = await supabase.from("adoptionapplications").delete().eq("id", id).eq("userid", userid).eq("status", "pending").select("id");
  if (error) throw error;
  return { deletedcount: data.length };
}

module.exports = { applicationstatusschema, adoptionapplicationschema, addadoptionapplication, findbyid, findall, findbyadoptionapplicationid, findbyuserbookwithstatuses, findapprovedbyuser, decideapplication, deletependingforuser };
