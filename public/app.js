const form = document.querySelector("#search-form");
const addressInput = document.querySelector("#address");
const results = document.querySelector("#results");
const summary = document.querySelector("#summary");
const subject = document.querySelector("#subject");
const modePill = document.querySelector("#mode-pill");
const notice = document.querySelector("#notice");

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-US");

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
    metric("Estimated value", money.format(data.subject.estimatedValue)),
    metric("Beds / Baths", `${data.subject.beds} / ${data.subject.baths}`),
    metric("Square feet", number.format(data.subject.sqft)),
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
              <span>${money.format(comp.price)}</span>
              <span>${comp.beds} bd</span>
              <span>${comp.baths} ba</span>
              <span>${number.format(comp.sqft)} sqft</span>
              <span>${comp.distanceMiles} mi</span>
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
    const response = await fetch(`/api/comps?address=${encodeURIComponent(address)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Search failed.");
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
