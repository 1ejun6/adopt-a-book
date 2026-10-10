//keep endpoint-specific fields and omit empty message/error fields.
//a response with an error must not report http success.
function normalizeresponse(req, res, next) {
  const sendjson = res.json.bind(res);

  res.json = (body) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return sendjson(body);
    }

    const error = typeof body.error === "string" && body.error ? body.error : null;
    const message = typeof body.message === "string" && body.message ? body.message : null;
    if (error && res.statusCode < 400) res.status(400);

    const response = { ...body };
    if (error) {
      response.error = message ? `${error}: ${message}` : error;
      delete response.message;
    } else {
      delete response.error;
      if (!message) delete response.message;
    }
    return sendjson(response);
  };

  next();
}

module.exports = { normalizeresponse };
