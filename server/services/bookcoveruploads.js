const { randomUUID } = require('node:crypto');
const supabase = require('../supabase/supabase');

const bucket = 'book-covers';
const maxSize = 5 * 1024 * 1024;
const contentTypes = ['image/jpeg', 'image/png', 'image/webp'];
const storage = supabase.storage.from(bucket);
const publicPrefix = storage.getPublicUrl('').data.publicUrl;
const invalid = message => Object.assign(new Error(message), { status: 422, field: 'cover' });

//@lee-hlmilk > validate file bytes as well as the supplied content type > never store active formats such as SVG
async function upload(buffer, contentType, userid) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > maxSize) throw invalid('Choose a JPG, PNG or WebP image up to 5 MB.');
  let extension;
  if (contentType === 'image/jpeg' && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) extension = 'jpg';
  if (contentType === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = 'png';
  if (contentType === 'image/webp' && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') extension = 'webp';
  if (!extension) throw invalid('The photo must be a valid JPG, PNG or WebP image.');
  const path = `${userid}/${randomUUID()}.${extension}`;
  const { error } = await storage.upload(path, buffer, { contentType, upsert: false });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}

function coverPath(url) {
  if (typeof url !== 'string' || !url.startsWith(publicPrefix)) return null;
  const path = url.slice(publicPrefix.length);
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path) ? path : null;
}

//@lee-hlmilk > remove only our managed uploads after the last copy stops using them > external covers stay untouched
async function removeUnused(urls) {
  for (const url of new Set(urls)) {
    const path = coverPath(url);
    if (!path) continue;
    const { count, error } = await supabase.from('books').select('id', { count: 'exact', head: true }).like('coverurl', `${url}%`);
    if (error) throw error;
    if (count !== 0) continue;
    const result = await storage.remove([path]);
    if (result.error) throw result.error;
  }
}

async function cleanup(urls) {
  try { await removeUnused(urls); }
  catch (error) { console.error('Unused book cover cleanup failed >', error.message); }
}

module.exports = { upload, coverPath, removeUnused, cleanup, maxSize, contentTypes };
