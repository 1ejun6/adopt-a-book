const open_library_api = process.env.openlibraryapi;

function getuseragent() {
  const contact = "contact-not-configured";
  return `adopt-a-book (${contact})`;
}

function generalgenres(subjects = []) {
  if (!Array.isArray(subjects)) { return []; }
  const tags = subjects.filter(subject => typeof subject === "string")
    .map(subject => subject.normalize("NFKC").toLowerCase().replace(/[’]/g, "'")
      .replace(/[_/–—]+/g, " ").replace(/\s+/g, " ").trim());
  const fictiongenres = [
    ["Fantasy", /\bfantasy\b/],
    ["Science fiction", /\bscience[- ]fiction\b|\bsci[- ]fi\b/],
    ["Mystery", /\bmyster(?:y|ies)\b|\bdetective\b/],
    ["Thriller", /\bthrillers?\b|\bsuspense\b/],
    ["Romance", /\bromance\b|\blove stories\b/],
    ["Horror", /\bhorror\b|\bghost stories\b/],
    ["Adventure", /^adventure$|\badventure (?:stories|fiction)\b/],
    ["Historical fiction", /\bhistorical (?:fiction|novels?)\b/],
  ];
  const nonfictiongenres = [
    ["Biography", /\b(?:auto)?biograph(?:y|ies|ical)\b|\bmemoirs?\b/],
    ["History", /\bhistory\b/],
    ["Science", /\bscience\b|\bphysics\b|\bchemistry\b|\bbiology\b/],
    ["Technology", /\btechnology\b|\bcomputers?\b|\bprogramming\b/],
    ["Business", /\bbusiness\b|\beconomics\b|\bfinance\b/],
    ["Self-help", /\bself[- ]help\b|\bpersonal development\b/],
    ["Health", /\bhealth\b|\bmedicine\b|\bnutrition\b/],
    ["Cooking", /\bcook(?:ing|books?)\b|\brecipes\b/],
    ["Travel", /\btravel\b|\bguidebooks?\b/],
    ["Art", /\barts?\b|\bpainting\b|\bdrawing\b/],
    ["Religion", /\breligion\b|\bspirituality\b/],
    ["Philosophy", /\bphilosophy\b/],
  ];
  const formats = [
    ["Poetry", /\bpoetry\b|\bpoems\b/],
    ["Comics", /\bcomics\b|\bgraphic novels?\b|\bmanga\b/],
  ];
  const matches = rules => rules.filter(([, pattern]) => tags.some(tag => pattern.test(tag))).map(([genre]) => genre);
  const fiction = matches(fictiongenres);
  const isfiction = fiction.length > 0 || tags.some(tag => /\bfiction\b/.test(tag) && !/\bnon[- ]?fiction\b/.test(tag));
  const genres = [...fiction, ...matches(formats), ...(isfiction ? [] : matches(nonfictiongenres))];
  if (genres.length) { return [genres[0]]; }
  if (tags.some(tag => /\bnon[- ]?fiction\b/.test(tag))) { return ["Nonfiction"]; }
  if (tags.some(tag => /\byoung adult\b/.test(tag))) { return ["Young adult"]; }
  if (tags.some(tag => /\bchildren(?:'s)?\b|\bjuvenile\b|\bpicture books\b/.test(tag))) { return ["Children"]; }
  return isfiction ? ["Fiction"] : [];
}

function mapsearchresult(item) {
  return {
    title: item.title,
    authors: item.author_name || [],
    isbn: item.isbn?.[0] || null,
    subjects: generalgenres(item.subject || []),
    publicationyear: item.first_publish_year || null,
    description: "",
    source: "open_library",
    coverurl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : null,
    openlibraryid: item.key || null
  };
}

async function getdescription(id) {
  const workid = String(id).replace(/^\/works\//, "");
  if (!/^OL\d+W$/.test(workid)) {
    throw Object.assign(new Error("invalid Open Library work ID"), { status: 422, field: "openlibraryid" });
  }
  const response = await fetch(new URL(`/works/${workid}.json`, open_library_api), {
    headers: { "User-Agent": getuseragent() },
    signal: AbortSignal.timeout(5000)
  });
  if (response.status === 404) { return ""; }
  if (!response.ok) {
    throw Object.assign(new Error("Open Library description unavailable"), { status: 502 });
  }
  const work = await response.json();
  const description = typeof work.description === "string" ? work.description : work.description?.value;
  return typeof description === "string" ? description.trim() : "";
}

async function searchbooks(query) {
  const url = new URL("/search.json", open_library_api);
  url.searchParams.set("q", query);
  url.searchParams.set("fields", "key,title,author_name,isbn,first_publish_year,subject,cover_i");
  url.searchParams.set("limit", "20");

  const response = await fetch(url, {
    headers: { "User-Agent": getuseragent() },
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) {
    throw new Error(`open library search failed with ${response.status}`);
  }

  const payload = await response.json();
  return (payload.docs || []).map(mapsearchresult);
}

module.exports = { searchbooks, getdescription, generalgenres };
