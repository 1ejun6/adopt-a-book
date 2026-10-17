const { z } = require("zod");
const { readall } = require("./query");
const supabase = require("../supabase/supabase");

const userschema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  email: z.email().transform((email) => email.toLowerCase()),
  role: z.enum(["customer", "admin"]).default("customer")
});


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
  return (await readall(query)).map(mapuser);
}
const findadminaccounts = () => many(supabase.from("users").select("*").eq("role", "admin"));
const findadminbyid = (id) => one(supabase.from("users").select("*").eq("id", id).eq("role", "admin"));

const findonebyemailexcludingid = (email, id) => one(supabase.from("users").select("*").eq("email", email).neq("id", id));




const findcustomerbyid = (id) => one(supabase.from("users").select("*").eq("id", id).eq("role", "customer"));

module.exports = { userschema, findonebyemail, findbyid, createaccount, findadminaccounts, findadminbyid, findonebyemailexcludingid, findcustomerbyid };
