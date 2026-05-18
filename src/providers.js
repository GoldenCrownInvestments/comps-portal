const SAMPLE_STREETS = [
  "Maple Ave",
  "Cedar Street",
  "Oak Ridge Drive",
  "Sunset Boulevard",
  "Pine Hollow Lane",
  "Riverside Way",
];

function hash(input) {
  let value = 0;
  for (let i = 0; i < input.length; i += 1) {
    value = (value * 31 + input.charCodeAt(i)) >>> 0;
  }
  return value;
}

function money(value) {
  return Math.round(value / 1000) * 1000;
}

function sourceSearchUrl(source, address) {
  const encoded = encodeURIComponent(address);
  if (source === "Zillow") return `https://www.zillow.com/homes/${encoded}_rb/`;
  return `https://www.redfin.com/homes-for-sale#!search_location=${encoded}`;
}

function propertyAddress(property) {
  return [property.street_address, property.city, property.state, property.zipcode].filter(Boolean).join(", ");
}

function normalizeStatus(status) {
  if (!status) return "Unknown";
  return String(status).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeApillowResult(result, index) {
  const property = result.property || result;
  const address = propertyAddress(property) || result.url || `Zillow comp ${index + 1}`;

  return {
    id: `zillow-${property.zpid || index + 1}`,
    source: "Zillow",
    address,
    status: normalizeStatus(property.home_status),
    price: property.price || property.zestimate || property.last_sold_price || null,
    beds: property.bedrooms ?? null,
    baths: property.bathrooms ?? null,
    sqft: property.living_area ?? null,
    distanceMiles: property.distance_miles ?? null,
    zillowSaves: property.favorite_count ?? null,
    zillowViews: property.page_view_count ?? null,
    redfinLikes: null,
    url: result.url || property.url || sourceSearchUrl("Zillow", address),
  };
}

async function pollApillowJob(jobId, apiKey) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(`https://api.apillow.co/v1/results/${jobId}`, {
      headers: { "X-API-Key": apiKey },
    });

    if (!response.ok) {
      throw new Error(`APIllow results returned ${response.status}`);
    }

    const payload = await response.json();
    if (payload.status === "complete") return payload;
    if (payload.status === "failed") throw new Error("APIllow job failed.");
    await new Promise((resolve) => setTimeout(resolve, 3500));
  }

  throw new Error("APIllow job timed out.");
}

async function apillowProvider(address) {
  const apiKey = process.env.APILLOW_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.apillow.co/v1/properties", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      search: address,
      type: "sale",
      max_items: Number(process.env.APILLOW_MAX_ITEMS || 8),
    }),
  });

  if (!response.ok) {
    throw new Error(`APIllow returned ${response.status}`);
  }

  const submitted = await response.json();
  const payload = submitted.status === "complete" ? submitted : await pollApillowJob(submitted.job_id, apiKey);
  const comps = (payload.results || []).filter((result) => result.success !== false).map(normalizeApillowResult);
  const subjectProperty = comps[0] || {};

  return {
    address,
    mode: "live",
    generatedAt: new Date().toISOString(),
    note: "Live Zillow data connected through APIllow. Redfin likes require a separate Redfin-capable provider.",
    subject: {
      beds: subjectProperty.beds ?? null,
      baths: subjectProperty.baths ?? null,
      sqft: subjectProperty.sqft ?? null,
      estimatedValue: subjectProperty.price ?? null,
    },
    comps,
  };
}

function demoComps(address) {
  const seed = hash(address);
  const basePrice = 325000 + (seed % 380000);
  const beds = 2 + (seed % 4);
  const baths = 1 + ((seed >> 3) % 3);
  const sqft = 1050 + (seed % 1400);

  const comps = Array.from({ length: 6 }, (_, index) => {
    const source = index % 2 === 0 ? "Zillow" : "Redfin";
    const shifted = seed >>> index;
    const nudge = (index - 2) * 18500 + (shifted % 17000);
    const compAddress = `${100 + (shifted % 880)} ${SAMPLE_STREETS[index]}`;
    const price = money(basePrice + nudge);
    const compSqft = sqft + (index - 3) * 85;

    return {
      id: `${source.toLowerCase()}-${index + 1}`,
      source,
      address: compAddress,
      status: index < 4 ? "Active" : "Sold",
      price,
      beds: Math.max(1, beds + (index % 3) - 1),
      baths: Math.max(1, baths + (index % 2)),
      sqft: compSqft,
      distanceMiles: Number((0.2 + index * 0.17).toFixed(2)),
      zillowSaves: source === "Zillow" ? 18 + ((seed >>> (index + 2)) % 280) : null,
      redfinLikes: source === "Redfin" ? 9 + ((seed >>> (index + 1)) % 190) : null,
      url: sourceSearchUrl(source, compAddress),
    };
  });

  return {
    address,
    mode: "demo",
    generatedAt: new Date().toISOString(),
    note: "Demo values are deterministic placeholders. Connect an approved Zillow/Redfin data provider to return live saves and likes.",
    subject: {
      beds,
      baths,
      sqft,
      estimatedValue: money(basePrice),
    },
    comps,
  };
}

async function liveProvider(address) {
  const endpoint = process.env.COMPS_PROVIDER_URL;
  if (!endpoint) return null;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: process.env.COMPS_PROVIDER_TOKEN ? `Bearer ${process.env.COMPS_PROVIDER_TOKEN}` : "",
    },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    throw new Error(`Provider returned ${response.status}`);
  }

  return response.json();
}

export async function findComps(address) {
  const apillow = await apillowProvider(address);
  if (apillow) return apillow;

  const live = await liveProvider(address);
  if (live) return { ...live, mode: live.mode || "live" };
  return demoComps(address);
}
