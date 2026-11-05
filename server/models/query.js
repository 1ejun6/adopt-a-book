

async function readall(query, order = "id") {
  const rows = [];
  query = query.order(order);
  for (;;) {
    const { data, error } = await query.range(rows.length, rows.length + 499);
    if (error) throw error;
    if (!data.length) return rows;
    rows.push(...data);
  }
}
module.exports = { readall };
