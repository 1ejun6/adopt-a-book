

async function readall(query) {
  const rows = [];
  query = query.order("id");
  for (;;) {
    const { data, error } = await query.range(rows.length, rows.length + 499);
    if (error) throw error;
    if (!data.length) return rows;
    rows.push(...data);
  }
}
module.exports = { readall };
