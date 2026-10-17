const { z } = require("zod");
const stations = require("./mrtstations");
const { readall } = require("./query");
const { thumbnailurl } = require("../utils/bookcovers");
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
  ownerid: z.uuid().nullable().optional(),
  condition: z.enum(["like new", "good", "fair"]).nullable().optional(),
  mrtstationid: z.uuid({ error: "choose an MRT station" }),
  status: z.enum(["available", "reserved", "adopted", "withdrawn"]).default("available")
}).strict();

const bookupdateschema = bookschema.omit({ source: true, createdby: true, ownerid: true, status: true }).partial().extend({
  authors: bookschema.shape.authors.removeDefault().optional(),
  subjects: bookschema.shape.subjects.removeDefault().optional(),
  description: bookschema.shape.description.removeDefault().optional()
}).strict().refine((fields) => Object.keys(fields).length > 0, "provide at least one field");

const mapbook = (row) => (row ? { ...row, ...(row.mrtstation ? { collectionarea: row.mrtstation.name } : {}), _id: row.id } : null);

async function many(query) {
  return (await readall(query)).map(mapbook);
}

async function createbook(bookdata) {
  const validatedbook = bookschema.parse(bookdata);
  await stations.validatewrite(validatedbook.mrtstationid);
  const { data, error } = await supabase.from("books").insert(validatedbook).select(`*,${stations.relation}`).single();
  if (error) throw error;
  return mapbook(data);
}


async function getbookbyid(id) {
  const { data, error } = await supabase.from("books").select(`*,${stations.relation}`).eq("id", id).maybeSingle();
  if (error) throw error;
  return stations.decorate(mapbook(data), true);
}





const listingschema = bookschema.pick({ title: true, authors: true, description: true, condition: true, mrtstationid: true }).extend({
  title: z.string().trim().min(1).max(200),
  authors: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  description: z.string().trim().max(2000).default(""),
  condition: z.enum(["like new", "good", "fair"]),
  mrtstationid: z.uuid({ error: "choose an MRT station" })
}).strict();
const listingupdateschema = listingschema.partial().extend({
  authors: listingschema.shape.authors.removeDefault().optional(),
  description: listingschema.shape.description.removeDefault().optional()
}).refine((fields) => Object.keys(fields).length > 0, "provide at least one field");
const ownedbooks = async (userid) => (await many(supabase.from("books").select(`*,${stations.relation}`).eq("ownerid", userid).order("createdat", { ascending: false }))).map(row => stations.decorate(row, true));
async function editbook(id, actorid, changes) {
  if (changes.mrtstationid !== undefined) {
    const current = await getbookbyid(id);
    await stations.validatewrite(changes.mrtstationid, current?.mrtstationid);
  }
  const { data, error } = await supabase.rpc("edit_book", { book_id: id, actor_id: actorid, changes }).single();
  if (error) throw error;
  return getbookbyid(data.id);
}
async function withdrawbooks(ids, actorid) {
  const { data, error } = await supabase.rpc("withdraw_books", { book_ids: ids, actor_id: actorid });
  if (error) throw error;
  return data;
}
async function deletebooks(ids, actorid) {
  const { data, error } = await supabase.rpc("delete_books", { book_ids: ids, actor_id: actorid });
  if (error) throw error;
  return data;
}
const publicfields = `id,title,authors,isbn,subjects,publicationyear,description,coverurl,openlibraryid,source,status,condition,collectionarea,mrtstationid,${stations.relation},owner:users!books_ownerid_fkey(name)`;
async function publicbooks(id) {
  let query = supabase.from("books").select(publicfields).neq("status", "withdrawn");
  if (id) {
    const { data, error } = await query.eq("id", id).maybeSingle();
  if (error) throw error;
    return mapbook(data);
  }
  return many(query.order("title"));
}

const catalogueschema = z.object({
  search: z.string().trim().default(""),
  status: z.enum(["available", "reserved", "adopted"]).optional(),
  subject: z.string().trim().min(1).optional(),
  sort: z.enum(["title", "author", "newest", "nearest"]).default("title"),
  mrtstationids: stations.stationids,
  page: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24)
});
async function catalogue(query) {
  const filters = catalogueschema.parse(query);
  if (filters.sort === "nearest" && filters.mrtstationids === undefined) throw stations.invalid("nearest sorting requires mrtstationids");
  const { data, error } = await supabase.rpc("browse_books", {
    search_term: filters.search,
    book_status: filters.status || null,
    book_subject: filters.subject || null,
    sort_by: filters.sort,
    page_number: filters.page,
    page_size: filters.limit,
    station_ids: filters.mrtstationids ?? null
  });
  if (error) throw error;
  return { ...data, books: data.books.map(mapbook), page: filters.page, limit: filters.limit };
}

const inventoryschema = catalogueschema.omit({ mrtstationids: true }).extend({
  sort: z.enum(["title", "author", "newest"]).default("title"),
  status: z.enum(["available", "reserved", "adopted", "withdrawn"]).optional(),
  title: z.string().trim().optional(),
  author: z.string().trim().min(1).optional(),
  isbn: z.string().trim().min(1).optional()
});

async function inventory(query) {
  const filters = inventoryschema.parse(query);
  const { data, error } = await supabase.rpc("browse_admin_books", {
    search_term: filters.search || filters.title || "",
    book_status: filters.status || null,
    book_subject: filters.subject || null,
    book_author: filters.author || null,
    book_isbn: filters.isbn || null,
    page_number: filters.page,
    page_size: filters.limit
  });
  if (error) throw error;
  return {
    ...data,
    books: data.books.map(row => ({ ...mapbook(row), thumbnailurl: thumbnailurl(row.coverurl) })),
    page: filters.page,
    limit: filters.limit
  };
}

module.exports = { bookschema, bookupdateschema, createbook, getbookbyid, listingschema, listingupdateschema, ownedbooks, editbook, withdrawbooks, deletebooks, publicbooks, publicfields, catalogueschema, catalogue, inventoryschema, inventory };
