const { z } = require("zod");
const { readall } = require("./query");
const supabase = require("../supabase/supabase");

const applicationstatusschema = z.enum(["pending", "approved", "rejected", "cancelled"]);
const adoptionapplicationschema = z.object({
  userid: z.string().uuid(),
  bookid: z.string().uuid(),
  status: applicationstatusschema.default("pending")
});

const mapapplication = (row) => (row ? { ...row, _id: row.id,
  ...(row.bookid?.mrtstation ? { bookid: { ...row.bookid, collectionarea: row.bookid.mrtstation.name } } : {})
} : null);

async function many(query) {
  return (await readall(query)).map(mapapplication);
}

async function one(query) {
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return mapapplication(data);
}

const selectwithrelations = "*, userid:users(id,name), bookid:books(id,title,authors,status,ownerid,condition,collectionarea,coverurl,mrtstationid,mrtstation:mrtstations(id,name,codes,lat,lng,selectable))";

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


async function decideapplication(id, status, decidedby) {
  const validatedstatus = z.enum(["approved", "rejected"]).parse(status);
  const validatedadminid = z.string().uuid().parse(decidedby);
  const validatedid = z.string().uuid().parse(id);
  const { data, error } = await supabase.rpc("decide_book_application", { application_id: validatedid, actor_id: validatedadminid, decision: validatedstatus });
  if (error) throw error;
  return { autorejectedcount: Number(data) || 0 };
}


const forbook = (bookid) => many(supabase.from("adoptionapplications").select(selectwithrelations).eq("bookid", bookid).order("createdat"));

const ownerrequests = (ownerid) => many(supabase.from("adoptionapplications")
  .select("bookid,status,books!inner(ownerid)").eq("books.ownerid", ownerid).eq("status", "pending"));

module.exports = { applicationstatusschema, adoptionapplicationschema, addadoptionapplication, findbyid, findall, findbyadoptionapplicationid, findbyuserbookwithstatuses, decideapplication, forbook, ownerrequests };
