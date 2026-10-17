function configuredorigin() {
  try {
    const url = new URL(process.env.clienturl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
    return url.origin;
  } catch {
    throw new Error("clienturl must be a valid http(s) client origin");
  }
}


function mutationorigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  const hascookies = Boolean(req.cookies?.access_token || req.cookies?.refresh_token);
  if ((origin && origin !== configuredorigin()) || (!origin && (hascookies || req.get("sec-fetch-site") === "cross-site"))) {
    return res.status(403).json({ error: "request origin is not allowed" });
  }
  return next();
}
module.exports = { configuredorigin, mutationorigin };
