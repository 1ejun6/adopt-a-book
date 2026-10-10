const { z } = require("zod");
const supabase = require("../supabase/supabase");

const bookschema = z.object({
  title: z.string().trim().min(1, "title is required"),
  authors: z.array(z.string().trim()).default([]),
  isbn: z.string().trim().optional().nullable(),
  subjects: z.array(z.string().trim()).default([]),
  publicationyear: z.coerce.number().int().optional().nullable(),
  description: z.string().default(""),
  coverurl: z.string().trim().optional().nullable().or(z.literal("")),
  openlibraryid: z.string().trim().optional().nullable(),
  source: z.enum(["manual", "open_library"]).default("manual"),
  createdby: z.string().uuid().optional().nullable(),
  status: z.enum(["available", "reserved", "adopted"]).default("available")
});

const bookupdateschema = bookschema.omit({ source: true, createdby: true }).partial();

const mapbook = (row) => (row ? { ...row, _id: row.id } : null);

async function many(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapbook);
}

async function createbook(bookdata) {
  const validatedbook = bookschema.parse(bookdata);
  const { data, error } = await supabase.from("books").insert(validatedbook).select().single();
  if (error) throw error;
  return mapbook(data);
}

async function getallbooks({ query = {} } = {}) {
  let request = supabase.from("books").select("*");

  if (query.search || query.titlesearch || query.namesearch) {
    const term = query.search || query.titlesearch || query.namesearch;
    request = request.ilike("title", `%${term}%`);
  }
  if (query.status) {
    request = request.eq("status", query.status);
  }
  if (query.author) {
    request = request.contains("authors", [query.author]);
  }
  if (query.subject) {
    request = request.contains("subjects", [query.subject]);
  }
  if (query.isbn) {
    request = request.eq("isbn", query.isbn);
  }

  return many(request.order("title"));
}

async function updatebook(id, bookdata) {
  const validatedbook = bookupdateschema.parse(bookdata);
  const { data, error } = await supabase.from("books").update(Object.fromEntries(Object.entries(validatedbook).filter(([key]) => Object.hasOwn(bookdata, key)))).eq("id", id).select("id");
  if (error) throw error;
  return { matchedcount: data.length, modifiedcount: data.length };
}

const updatebookstatus = (id, status) => updatebook(id, { status });

async function getbookbyid(id) {
  const { data, error } = await supabase.from("books").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return mapbook(data);
}

const getbooksbyids = (ids) => many(supabase.from("books").select("id, title, status, coverurl").in("id", ids));

async function deletebooksbyids(ids) {
  const { data, error } = await supabase.from("books").delete().in("id", ids).select("id");
  if (error) throw error;
  return { deletedcount: data.length };
}

async function getallsubjects() {
  const rows = await many(supabase.from("books").select("subjects"));
  const allsubjects = rows.flatMap((row) => row.subjects || []);
  return [...new Set(allsubjects)];
}

const findbooksbysubject = (subject) => many(supabase.from("books").select("*").contains("subjects", [subject]));

module.exports = { bookschema, bookupdateschema, createbook, getallbooks, updatebook, updatebookstatus, getbooksbyids, deletebooksbyids, getbookbyid, getallsubjects, findbooksbysubject };
