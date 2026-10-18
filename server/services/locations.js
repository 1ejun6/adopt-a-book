
const cache = new Map();
const pending = new Map();
let token;
let tokenrequest;
const onemapurl = "https://www.onemap.gov.sg";

function failure(message, status = 503) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function supported(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 1.15 && lat <= 1.48 && lng >= 103.58 && lng <= 104.12;
}

function distancekm(a, b) {
  const rad = value => value * Math.PI / 180;
  const latdifference = rad(b.lat - a.lat);
  const lngdifference = rad(b.lng - a.lng);
  const h = Math.sin(latdifference / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(lngdifference / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

async function request(url, options = {}) {
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
    const data = await response.json();

    if (!response.ok || data.error) {
      const status = response.status === 429 ? 429 : 503;
      const message = status === 429
        ? "location search is busy; try again shortly"
        : "OneMap lookup unavailable; check server credentials or try again";
      const error = failure(message, status);
      error.unauthorized = response.status === 401 || (response.ok && Boolean(data.error));
      throw error;
    }
    return data;
  } catch (error) {
    if (error.status) {
      throw error;
    }
    throw failure("location lookup unavailable; try again shortly");
  }
}

async function gettoken() {
  if (token && token.expires > Date.now() + 60000) {
    return token.value;
  }
  if (process.env.onemaptoken) {
    return process.env.onemaptoken;
  }
  if (!process.env.ONEMAP_EMAIL || !process.env.ONEMAP_PASSWORD) {
    throw failure("location search is not configured; set OneMap credentials on the server");
  }
  if (!tokenrequest) {
    tokenrequest = (async () => {
      const data = await request(`${onemapurl}/api/auth/post/getToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: process.env.ONEMAP_EMAIL, password: process.env.ONEMAP_PASSWORD })
      });
      const expires = Number(data.expiry_timestamp) * 1000;
      if (!data.access_token || !Number.isFinite(expires) || expires <= Date.now() + 60000) {
        throw failure("OneMap authentication failed; check server credentials");
      }
      token = { value: data.access_token, expires };
      return token.value;
    })().finally(() => {
      tokenrequest = null;
    });
  }
  return tokenrequest;
}

async function search(query, page = 1) {
  const url = new URL(`${onemapurl}/api/common/elastic/search`);
  url.searchParams.set("searchVal", query);
  url.searchParams.set("returnGeom", "Y");
  url.searchParams.set("getAddrDetails", "Y");
  url.searchParams.set("pageNum", String(page));

  for (let attempt = 0; attempt < 2; attempt++) {
    const authorization = await gettoken();
    try {
      const data = await request(url, { headers: { Authorization: authorization } });
      if (!Array.isArray(data.results) || !Number.isInteger(data.totalNumPages) || data.totalNumPages < 0) {
        throw failure("OneMap returned an invalid search response");
      }
      return data;
    } catch (error) {
      if (attempt || !error.unauthorized || process.env.onemaptoken) {
        throw error;
      }
      token = null;
    }
  }
}

async function cached(key, ttl, load) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) {
    cache.delete(key);
    cache.set(key, hit);
    return hit.value;
  }
  if (hit) {
    cache.delete(key);
  }
  if (pending.has(key)) {
    return pending.get(key);
  }
  if (pending.size >= 4) {
    throw failure("location search is busy; try again shortly", 429);
  }
  const task = Promise.resolve().then(load).then(value => {
    if (!cache.has(key) && cache.size >= 100) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
    cache.set(key, { value, expires: Date.now() + ttl });
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

function point(row) {
  return { lat: Number(row.LATITUDE), lng: Number(row.LONGITUDE) };
}

async function resolveplaces(query) {
  return cached(`place:${query.toLowerCase()}`, 15 * 60 * 1000, async () => {
    const data = await search(query);
    return data.results.map(row => ({
      name: row.ADDRESS || row.SEARCHVAL || query,
      postcode: String(row.POSTAL || ""),
      ...point(row),
      source: "onemap"
    })).filter(place => supported(place.lat, place.lng) && (!/^\d{6}$/.test(query) || place.postcode === query)).slice(0, 5);
  });
}

function rankedstations(point, stations, radius = Infinity) {
  const ranked = [];
  for (const station of stations) {
    const distance = distancekm(point, station);
    if (distance <= radius) {
      ranked.push({ ...station, distanceKm: distance });
    }
  }
  return ranked.sort((a, b) => a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));
}

function neareststation(point, stations) {
  let nearest = null;
  let shortest = Infinity;
  for (const station of stations) {
    const distance = distancekm(point, station);
    if (distance < shortest || (distance === shortest && (!nearest || station.id.localeCompare(nearest.id) < 0))) {
      nearest = station;
      shortest = distance;
    }
  }
  return nearest ? { ...nearest, distanceKm: shortest } : null;
}

async function nearby(input) {
  const [places, stations] = await Promise.all([
    input.query
      ? resolveplaces(input.query)
      : [{ name: "Your selected location", lat: input.lat, lng: input.lng, source: "coordinates" }],
    require("../models/mrtstations").list()
  ]);
  if (!stations.length) throw failure("MRT catalogue unavailable; contact the administrator");
  if (!places.length) {
    throw failure("postcode or place not found; try another address or Near me", 404);
  }
  const location = places[0];
  const nearbystations = rankedstations(location, stations, input.radiusKm);
  const ids = new Set(nearbystations.map(station => station.id));
  const collections = (input.collections || []).map(point => {
    const station = neareststation(point, stations);
    return {
      id: point.id,
      nearestStation: station,
      distanceKm: distancekm(location, point),
      matches: ids.has(station.id)
    };
  });
  return {
    location,
    radiusKm: input.radiusKm,
    nearestStation: nearbystations[0] || null,
    stations: nearbystations,
    collections,
    alternatives: places.slice(1),
    sources: { stations: "OneMap search index", postcodes: "OneMap", approximate: true }
  };
}

module.exports = { nearby };
