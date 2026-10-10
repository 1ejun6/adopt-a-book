const { z } = require("zod");
const supabase = require("../supabase/supabase");

const userschema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  email: z.email().transform((email) => email.toLowerCase()),
  role: z.enum(["customer", "admin"]).default("customer")
});

const userupdateschema = userschema.pick({ name: true, email: true }).partial();

const mapuser = (row) => (row ? { ...row, _id: row.id } : null);

async function one(query) {
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return mapuser(data);
}

const findonebyemail = (email) => one(supabase.from("users").select("*").eq("email", email));
const findbyid = (id) => one(supabase.from("users").select("*").eq("id", id));

async function createaccount(account) {
  const validatedaccount = userschema.parse(account);
  const { data, error } = await supabase.from("users").insert(validatedaccount).select().single();
  if (error) throw error;
  return mapuser(data);
}
async function many(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapuser);
}
const findadminaccounts = () => many(supabase.from("users").select("*").eq("role", "admin"));
const findadminbyid = (id) => one(supabase.from("users").select("*").eq("id", id).eq("role", "admin"));
const findadminsbyids = (ids) => many(supabase.from("users").select("id,email").in("id", ids).eq("role", "admin"));

async function deleteadminsbyids(ids) {
  const { data, error } = await supabase.from("users").delete().in("id", ids).eq("role", "admin").select("id");
  if (error) throw error;
  return { deletedcount: data.length };
}
const findonebyemailexcludingid = (email, id) => one(supabase.from("users").select("*").eq("email", email).neq("id", id));

async function updatebyrole(id, role, fields) {
  const validatedfields = userupdateschema.parse(fields);
  const { data, error } = await supabase.from("users").update(validatedfields).eq("id", id).eq("role", role).select().maybeSingle();
  if (error) throw error;
  return mapuser(data);
}

const updateadminbyid = (id, fields) => updatebyrole(id, "admin", fields);

const findcustomersbyids = (ids) => many(supabase.from("users").select("id,name,email").in("id", ids).eq("role", "customer"));

const findcustomerbyid = (id) => one(supabase.from("users").select("*").eq("id", id).eq("role", "customer"));
const updatecustomerbyid = (id, fields) => updatebyrole(id, "customer", fields);
const searchcustomerbyname = (name) => many(supabase.from("users").select("*").eq("role", "customer").ilike("name", `%${name}%`));

module.exports = { findcustomersbyids, userschema, userupdateschema, findonebyemail, findbyid, createaccount, findadminaccounts, findadminbyid, findadminsbyids, deleteadminsbyids, findonebyemailexcludingid, updateadminbyid, findcustomerbyid, updatecustomerbyid, searchcustomerbyname };
