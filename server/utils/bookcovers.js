function thumbnailurl(coverurl) {
  if (!coverurl) {return "";}
  try {
    const url = new URL(coverurl);
    if (url.hostname === "covers.openlibrary.org" && /^\/b\/[^/]+\/[^/]+-[SML]\.jpg$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/-[SML]\.jpg$/i, "-S.jpg");
      url.searchParams.set("default", "false");
      return url.href;
    }
  } catch {
  }
  return coverurl;
}

module.exports = { thumbnailurl };
