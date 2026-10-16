const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');

async function runsql(filename, books = []) {
  if (!process.env.databaseurl) {
    const error = new Error('databaseurl must be set in .env');
    error.status = 503;
    throw error;
  }
  const sql = await readFile(path.resolve(__dirname, '../../sql', filename), 'utf8');
  const client = new Client({ connectionString: process.env.databaseurl, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.query('begin');
    await client.query("select set_config('app.seed_books', $1, true)", [JSON.stringify(books)]);
    const results = await client.query(sql);
    await client.query('commit');
    const last = Array.isArray(results) ? results.at(-1) : results;
    return last.rows[0] || null;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

module.exports = { runsql };
