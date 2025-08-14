import fetch from "node-fetch";

// Your Bing Search API key
const BING_KEY = "YOUR_BING_API_KEY";
const BING_ENDPOINT = "https://api.bing.microsoft.com/v7.0/search";

// Trusted medical domains with scores
const TRUSTED = {
  "nih.gov": 1.0,
  "nlm.nih.gov": 1.0,
  "medlineplus.gov": 1.0,
  "mayoclinic.org": 0.95,
  "clevelandclinic.org": 0.95,
  "hopkinsmedicine.org": 0.95,
  "who.int": 1.0,
  "nhs.uk": 1.0,
  "nice.org.uk": 1.0,
  "cancer.gov": 1.0,
  "cdc.gov": 1.0,
  "emedicinehealth.com": 0.9,
  "health.harvard.edu": 0.95
};

// Extract base domain from a URL
function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return "";
  }
}

function trustScore(url) {
  const domain = getDomain(url);
  return TRUSTED[domain] || 0;
}

// Main search function
async function searchMedical(query) {
  const res = await fetch(`${BING_ENDPOINT}?q=${encodeURIComponent(query)}&count=20`, {
    headers: { "Ocp-Apim-Subscription-Key": BING_KEY }
  });

  if (!res.ok) throw new Error(`Bing API error: ${res.status}`);
  const data = await res.json();

  if (!data.webPages?.value) return [];

  // Rank and score results
  const results = data.webPages.value.map((item, i) => {
    const ts = trustScore(item.url);
    const baseScore = 1 - i / data.webPages.value.length; // higher rank → bigger score
    const final = (baseScore * 0.6) + (ts * 0.4); // weighting
    return {
      title: item.name,
      snippet: item.snippet,
      url: item.url,
      domain: getDomain(item.url),
      trust: ts,
      finalScore: final.toFixed(3)
    };
  });

  // Sort with trusted sites first
  return results.sort((a, b) => b.finalScore - a.finalScore);
}

// Run a sample query
const query = process.argv.slice(2).join(" ") || "asthma treatment";
searchMedical(query)
  .then(results => {
    console.table(results, ["title", "domain", "trust", "finalScore", "url"]);
  })
  .catch(err => console.error(err));
