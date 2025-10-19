import axios from "axios";
import * as cheerio from "cheerio";

const CANDIDATE_URLS = [
  "https://pdqinfo.ca/markets/manitoba/",
  "https://pdqinfo.ca/markets/manitoba",
  "https://pdqinfo.ca/prices",
  "https://pdqinfo.ca/grain-prices",
];

async function fetchHtml(url) {
  const { data } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    timeout: 10000,
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400, // follow redirects, treat 3xx as ok
  });
  return data;
}

function parseTable(html) {
  const $ = cheerio.load(html);
  // Try common table patterns PDQ uses
  const candidates = [
    ".table-responsive table tbody tr",
    "table tbody tr",
    "table tr",
  ];
  let rowsSel = null;
  for (const sel of candidates) {
    const rows = $(sel);
    if (rows.length >= 3) {
      rowsSel = sel;
      break;
    }
  }
  if (!rowsSel) return { rows: [], selector: null };

  const out = [];
  $(rowsSel).each((_, el) => {
    const cols = cheerio(el)
      .find("td")
      .map((__, td) => cheerio(td).text().trim())
      .get();

    // Expect at least: Location + 7 commodities
    if (cols.length >= 8) {
      out.push({
        location: cols[0],
        wheat: cols[1],
        feedWheat: cols[2],
        canola: cols[3],
        rye: cols[4],
        soybeans: cols[5],
        peas: cols[6],
        oats: cols[7],
      });
    }
  });
  return { rows: out, selector: rowsSel };
}

export default async function handler(req, res) {
  const debug = "debug" in req.query;
  try {
    let lastError = null;
    for (const url of CANDIDATE_URLS) {
      try {
        const html = await fetchHtml(url);
        const { rows, selector } = parseTable(html);
        if (rows.length) {
          res.setHeader("Cache-Control", "s-maxage=3600");
          return res.status(200).json(
            debug ? { sourceUrl: url, selector, count: rows.length, rows } : rows
          );
        }
        lastError = new Error(`No rows parsed from ${url}`);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error("No candidate URL succeeded");
  } catch (error) {
    console.error("Scraper error:", error?.message || error);
    res.status(500).json({
      error: "Failed to fetch PDQ Manitoba prices",
      details: String(error?.message || error),
    });
  }
}
