const openlibrary = require("../services/openlibrary");

const search = async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (!query) {
    return res.status(400).json({ error: "search query is required" });
  }

  try {
    const books = await openlibrary.searchbooks(query);
    return res.json({ books });
  } catch (error) {
    console.error(`[open library] search failed: ${error.message}`);
    return res.status(502).json({ error: "open library search unavailable" });
  }
};

module.exports = { search };
