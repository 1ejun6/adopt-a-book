const open_library_api = process.env.openlibraryapi;

function getuseragent() {
  const contact = "contact-not-configured";
  return `adopt-a-book (${contact})`;
}

function mapsearchresult(item) {
  return {
    title: item.title,
    authors: item.author_name || [],
    isbn: item.isbn?.[0] || null,
    subjects: (item.subject || []).slice(0, 20),
    publicationyear: item.first_publish_year || null,
    description: "",
    coverurl: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : null,
    openlibraryid: item.key || null
  };
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

module.exports = { searchbooks };
