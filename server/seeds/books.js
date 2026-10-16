const { createHash } = require('node:crypto');
const { searchbooks } = require('../services/openlibrary');
const { setTimeout: pause } = require('node:timers/promises');

async function loadbooks(query) {
  const categories = ['fantasy', 'mystery', 'history', 'science', 'children'];
  const queries = query ? [query] : categories.map(category => `subject:${category}`);
  const groups = [];
  try {
    for (const search of queries) {
      if (groups.length) await pause(1100);
      const matches = await searchbooks(search);
      groups.push(matches.filter(book => book.title?.trim() && book.openlibraryid).slice(0, query ? 20 : 5));
    }
  } catch (error) {
    error.status = 502;
    throw error;
  }
  const results = Array.from({ length: query ? 20 : 5 }, (_, index) =>
    groups.flatMap(group => group[index] ? [group[index]] : [])).flat();
  const books = new Map();
  for (const book of results) {
    if (!book.title?.trim() || !book.openlibraryid) continue;
    const hash = createHash('sha256').update(`open-library-seed:${book.openlibraryid}`).digest('hex');
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    books.set(book.openlibraryid, { ...book, id });
  }
  if (!books.size) {
    const error = new Error('Open Library returned no books');
    error.status = 422;
    throw error;
  }
  return [...books.values()];
}

module.exports = { loadbooks };
