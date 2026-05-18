const form = document.querySelector("#search-form");
const addressInput = document.querySelector("#address");
const results = document.querySelector("#results");
const summary = document.querySelector("#summary");
const subject = document.querySelector("#subject");
const modePill = document.querySelector("#mode-pill");
const notice = document.querySelector("#notice");
const apiBaseUrl = window.COMPS_API_BASE_URL || "";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-US");
const sampleStreets = ["Maple Ave", "Cedar Street", "Oak Ridge Drive", "Sunset Boulevard", "Pine Hollow Lane", "Riverside Way"];

function hash(input) {
  let value = 0;
  for (let i = 0; i < input.length; i += 1) {
    value = (value * 31 + input.charCodeAt(i)) >>> 0;
  }
  return value;
}

function roundedMoney(value) {
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
  const baths = 1 + ((seed >>> 3) % 3);
  const sqft = 1050 + (seed % 1400);
  const comps = sampleStreets.map((street, index) => {
    const source = index % 2 === 0 ? "Zillow" : "Redfin";
    const shifted = seed >>> index;
    const compAddress = `${100 + (shifted % 880)} ${street}`;
    return {
      id: `${source.toLowerCase()}-${index + 1}`,
      source,
      address: compAddress,
      status: index < 4 ? "Active" : "Sold",
      price: roundedMoney(basePrice + (index - 2) * 18500 + (shifted % 17000)),
      beds: Math.max(1, beds + (index % 3) - 1),
      baths: Math.max(1, baths + (index % 2)),
      sqft: sqft + (index - 3) * 85,
      distanceMiles: Number((0.2 + index * 0.17).toFixed(2)),
      zillowSaves: source === "Zillow" ? 18 + ((seed >>> (index + 2)) % 280) : null,
      redfinLikes: source === "Redfin" ? 9 + ((seed >>> (index + 1)) % 190) : null,
      url: sourceSearchUrl(source, compAddress),
    };
  });

  return {
    address,
    mode: "demo",
    note: "Static demo mode is active. Connect the hosted API provider for live Zillow saves and Redfin likes.",
    subject: { beds, baths, sqft, estimatedValue: roundedMoney(basePrice) },
    comps,
  };
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function summaryCard(label, value) {
  return `<div class="summary-card"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderSummary(data) {
  const comps = data.comps || [];
  const priced = comps.filter((comp) => comp.price);
  const avgPrice = priced.reduce((sum, comp) => sum + comp.price, 0) / Math.max(1, priced.length);
  const zillowSaves = comps.reduce((sum, comp) => sum + (comp.zillowSaves || 0), 0);
  const redfinLikes = comps.reduce((sum, comp) => sum + (comp.redfinLikes || 0), 0);

  summary.innerHTML = [
    summaryCard("Average comp price", money.format(avgPrice)),
    summaryCard("Comps found", comps.length),
    summaryCard("Zillow saves", number.format(zillowSaves)),
    summaryCard("Redfin likes", number.format(redfinLikes)),
  ].join("");
}

function renderSubject(data) {
  subject.classList.remove("muted-state");
  subject.innerHTML = [
    metric("Address", data.address),
    metric("Estimated value", data.subject.estimatedValue == null ? "N/A" : money.format(data.subject.estimatedValue)),
    metric("Beds / Baths", `${data.subject.beds ?? "N/A"} / ${data.subject.baths ?? "N/A"}`),
    metric("Square feet", data.subject.sqft == null ? "N/A" : number.format(data.subject.sqft)),
  ].join("");
}

function engagementValue(value) {
  return value == null ? "N/A" : number.format(value);
}

function renderResults(data) {
  modePill.textContent = data.mode === "live" ? "Live data" : "Demo data";
  modePill.title = data.note || "";
  notice.textContent = data.note || (data.mode === "live" ? "Live data provider connected." : "");
  results.classList.remove("empty-state");

  results.innerHTML = data.comps
    .map((comp) => {
      const sourceClass = comp.source === "Zillow" ? "source-zillow" : "source-redfin";
      return `
        <article class="comp-card">
          <div>
            <h3 class="comp-title">${comp.address}</h3>
            <div class="comp-meta">
              <span>${comp.price == null ? "N/A" : money.format(comp.price)}</span>
              <span>${comp.beds ?? "N/A"} bd</span>
              <span>${comp.baths ?? "N/A"} ba</span>
              <span>${comp.sqft == null ? "N/A" : number.format(comp.sqft)} sqft</span>
              <span>${comp.distanceMiles == null ? "N/A" : `${comp.distanceMiles} mi`}</span>
              <span>${comp.status}</span>
            </div>
            <div class="source-row">
              <span class="${sourceClass}">${comp.source}</span>
              <a href="${comp.url}" target="_blank" rel="noreferrer">Open source search</a>
            </div>
          </div>
          <div class="engagement" aria-label="Engagement metrics">
            <div><span>Zillow saves</span><strong>${engagementValue(comp.zillowSaves)}</strong></div>
            <div><span>Redfin likes</span><strong>${engagementValue(comp.redfinLikes)}</strong></div>
          </div>
        </article>
      `;
    })
    .join("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const address = addressInput.value.trim();
  if (!address) return;

  const button = form.querySelector("button");
  button.disabled = true;
  button.textContent = "Searching";
  modePill.textContent = "Searching";
  results.className = "results-grid empty-state";
  results.textContent = "Searching comps...";

  try {
    const apiRoot = apiBaseUrl || window.location.href;
    const apiUrl = new URL(`api/comps?address=${encodeURIComponent(address)}`, apiRoot);
    const response = await fetch(apiUrl);
    const contentType = response.headers.get("content-type") || "";
    const data = response.ok && contentType.includes("application/json") ? await response.json() : demoComps(address);
    renderSummary(data);
    renderSubject(data);
    renderResults(data);
  } catch (error) {
    modePill.textContent = "Error";
    results.className = "results-grid empty-state";
    results.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Search comps";
  }
});
