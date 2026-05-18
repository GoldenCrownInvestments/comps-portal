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
  const live = await liveProvider(address);
  if (live) return { ...live, mode: live.mode || "live" };
  return demoComps(address);
}
