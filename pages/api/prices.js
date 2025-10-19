import axios from "axios";
import * as cheerio from "cheerio";

// Try to recognize headers like "Wheat", "Feed Wheat", etc.
const HEADER_ALIASES = {
  location: ["location", "buyer", "region", "area", "site", "elevator"],
  wheat: ["wheat", "cwrs", "spring wheat"],
  feedWheat: ["feed wheat", "feedwheat", "feed"],
  canola: ["canola"],
  rye: ["rye"],
  soybeans: ["soybeans", "soybean", "soy"],
  peas: ["peas", "yellow peas", "green peas", "field peas"],
  oats: ["oats"],
};

function normalizeHeader(h) {
  const header = h.trim().toLowerCase().replace(/\s+/g, " ");
  for (const key of Object.keys(HEADER_ALIASES)) {
    if (HEADER_ALIASES[key].some(a => header.includes(a))) return key;
  }
  return null;
}

function parseNumber(txt) {
  if (!txt) return null;
  const n = txt
    .replace(/[$,]/g, "")
    .replace(/\s+\/?(bu|bu\.)?$/i, "")
    .trim();
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : null;
}

export default async function handler(req, res) {
  const sourceParam = req.query.source; // allow override via ?source=
  // Put any Manitoba Agriculture prices page you want here as the default:
  const DEFAULT_SOURCE =
    "https://www.gov.mb.ca/agriculture/markets-and-statistics/index.html"; // <- replace with the exact Grain Prices page when you have it

  const url = sourceParam || DEFAULT_SOURCE;
  const debug = "debug" in req.query;

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: s => s >= 200 && s < 400,
    });

    const $ = cheerio.load(html);

    // Find the first table that looks like the grain prices table
    let chosen = null;
    $("table").each((_, table) => {
      if (chosen) return;
      const headers = $(table)
        .find("thead th, thead td, tr:first-child th, tr:first-child td")
        .map((__, th) => $(th).text().trim())
        .get()
        .filter(Boolean);

      const normalized = headers.map(normalizeHeader).filter(Boolean);
      const hasAnyCommodity =
        normalized.includes("wheat") ||
        normalized.includes("feedWheat") ||
        normalized.includes("canola") ||
        normalized.includes("rye") ||
        normalized.includes("soybeans") ||
        normalized.includes("peas") ||
        normalized.includes("oats");

      const hasLocation = normalized.includes("location");

      if (hasAnyCommodity && hasLocation) {
        chosen = { elem: table, normalizedHeaders: normalized, rawHeaders: headers };
      }
    });

    if (!chosen) {
      throw new Error(
        "Could not find a prices table. Pass the exact page with ?source=<URL> or update DEFAULT_SOURCE."
      );
    }

    // Build a header→index map
    const headerMap = {};
    const rawHeaders = chosen.rawHeaders.map(h => h.trim());
    rawHeaders.forEach((h, idx) => {
      const key = normalizeHeader(h);
      if (key) headerMap[key] = idx;
    });

    // Extract rows
    const rows = [];
    const $tbodyRows = $(chosen.elem).find("tbody tr");
    ($tbodyRows.length ? $tbodyRows : $(chosen.elem).find("tr").slice(1)).each((_, tr) => {
      const cells = $(tr).find("td").map((__, td) => $(td).text().trim()).get();
      if (!cells.length) return;

      const row = {
        location: cells[headerMap.location] || "",
        wheat: parseNumber(cells[headerMap.wheat]),
        feedWheat: parseNumber(cells[headerMap.feedWheat]),
        canola: parseNumber(cells[headerMap.canola]),
        rye: parseNumber(cells[headerMap.rye]),
        soybeans: parseNumber(cells[headerMap.soybeans]),
        peas: parseNumber(cells[headerMap.peas]),
        oats: parseNumber(cells[headerMap.oats]),
      };

      // Keep if at least one commodity is present
      const hasAny =
        ["wheat", "feedWheat", "canola", "rye", "soybeans", "peas", "oats"]
          .some(k => row[k] != null);
      if (row.location && hasAny) rows.push(row);
    });

    if (!rows.length) {
      throw new Error("Table detected but no usable rows parsed.");
    }

    if (debug) {
      return res.status(200).json({
        source: url,
        headersDetected: chosen.rawHeaders,
        headerMap,
        count: rows.length,
        sample: rows.slice(0, 5),
      });
    }

    res.setHeader("Cache-Control", "s-maxage=1800");
    res.status(200).json(rows);
  } catch (err) {
    console.error("Manitoba Ag scraper error:", err.message);
    res.status(500).json({
      error: "Failed to fetch Manitoba Agriculture prices",
      details: err.message,
      hint:
        "Open the Manitoba page you use in a browser, copy the URL, and call /api/prices?source=<that URL>&debug=1 to verify.",
    });
  }
}
