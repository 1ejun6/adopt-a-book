const { z } = require("zod");
const supabase = require("../supabase/supabase");

const watchlistschema = z.object({ userid: z.string().uuid(), bookid: z.string().uuid(), bookname: z.string().trim().min(1), comments: z.string().default(""), lastupdated: z.coerce.date().default(() => new Date()) });
const mapentry = (row) => (row ? { ...row, _id: row.id } : null);

async function one(query) {
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return mapentry(data);
}

async function findbyuser(userid) {
  const { data, error } = await supabase.from("watchlist").select("*, bookid:books(*)").eq("userid", userid).order("lastupdated", { ascending: false });
  if (error) throw error;
  return data.map(mapentry);
}

const findbybookanduser = (bookid, userid) => one(supabase.from("watchlist").select("*").eq("bookid", bookid).eq("userid", userid));

async function createentry(value) {
  const entry = watchlistschema.parse(value);
  const { data, error } = await supabase.from("watchlist").insert(entry).select().single();
  if (error) throw error;
  return mapentry(data);
}

async function updatecomment(bookid, userid, comments) {
  comments = watchlistschema.shape.comments.parse(comments);
  const { data, error } = await supabase.from("watchlist").update({ comments, lastupdated: new Date() }).eq("bookid", bookid).eq("userid", userid).select().maybeSingle();
  if (error) throw error;
  return mapentry(data);
}

async function deleteentry(bookid, userid) {
  const { data, error } = await supabase.from("watchlist").delete().eq("bookid", bookid).eq("userid", userid).select("id").maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

module.exports = { watchlistschema, findbyuser, findbybookanduser, createentry, updatecomment, deleteentry };
