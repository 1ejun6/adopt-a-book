const supabase = require("../supabase/supabase");

async function removecustomerrecords(resource, ids, userid) {
  const { data, error } = await supabase.rpc("remove_customer_records", { resource, record_ids: ids, actor_id: userid });
  if (error) throw error;
  return data;
}

module.exports = { removecustomerrecords };
