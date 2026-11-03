const covers = require('../services/bookcoveruploads');
const { errorstatus, errormessage } = require('../utils/errors');

async function upload(req, res) {
  try {
    const coverurl = await covers.upload(req.body, req.get('content-type')?.split(';')[0], req.user.id);
    return res.status(201).json({ coverurl });
  } catch (error) { return res.status(errorstatus(error)).json({ error: errormessage(error, 'Could not upload the book photo. Please try again.') }); }
}

async function remove(req, res) {
  try {
    const path = covers.coverPath(req.body.coverurl);
    if (!path?.startsWith(`${req.user.id}/`)) return res.status(422).json({ error: 'Choose an uploaded photo belonging to this account.' });
    await covers.removeUnused([req.body.coverurl]);
    return res.status(204).end();
  } catch (error) { return res.status(errorstatus(error)).json({ error: errormessage(error, 'Could not remove the unused book photo.') }); }
}

module.exports = { upload, remove };
