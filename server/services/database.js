const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');

async function transaction(work) {
  if (!process.env.databaseurl) {
    throw Object.assign(new Error('databaseurl must be set in .env'), { status: 503 });
  }
  const client = new Client({ connectionString: process.env.databaseurl, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function runsql(filename) {
  if (!['base.sql', 'clear.sql', 'seed.sql'].includes(filename)) throw new Error('unsupported maintenance script');
  const sql = await readFile(path.resolve(__dirname, '../../sql', filename), 'utf8');
  return transaction(async client => {
    const results = await client.query(sql);
    const last = Array.isArray(results) ? results.at(-1) : results;
    return last.rows[0] || null;
  });
}

module.exports = { runsql };
