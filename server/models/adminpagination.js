const { z } = require("zod");
const supabase = require("../supabase/supabase");

const common = z.object({
  page: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  search: z.string().trim().max(500).default("")
});
const schemas = {
  applications: common.extend({ status: z.enum(["all", "pending", "approved", "rejected", "cancelled"]).default("all"), sort: z.enum(["oldest", "newest"]).default("oldest") }),
  appointments: common.extend({ view: z.enum(["all", "awaiting", "today", "upcoming", "overdue", "history"]).default("all"), status: z.enum(["all", "pending confirmation", "appointment confirmed", "collected", "cancelled", "rejected"]).default("all"), date: z.union([z.iso.date(), z.literal("")]).default("") }),
  drives: common.extend({ view: z.enum(["all", "upcoming", "past"]).default("all"), status: z.enum(["all", "open", "closed", "cancelled"]).default("all"), date: z.union([z.iso.date(), z.literal("")]).default("") })
};

//@lee-hlmilk > validate query values once > SQL filters/counts before returning only the requested page
async function browse(kind, query) {
  const filters = schemas[kind].parse(query);
  const { data, error } = await supabase.rpc(`browse_admin_${kind}`, {
    search_term: filters.search, selected_status: filters.status,
    ...(kind === "applications" ? { sort_by: filters.sort } : { selected_view: filters.view, selected_date: filters.date || null }),
    page_number: filters.page, page_size: filters.limit
  });
  if (error) throw error;
  return { ...data, page: filters.page, limit: filters.limit };
}

module.exports = { browse };
