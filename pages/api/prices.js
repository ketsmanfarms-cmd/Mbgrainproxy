import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const { data: html } = await axios.get("https://pdqinfo.ca/markets/manitoba/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      timeout: 10000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(html);
    const rows = $(".table-responsive table tbody tr");
    const results = [];

    rows.each((_, el) => {
      const cols = $(el).find("td").map((_, td) => $(td).text().trim()).get();
      if (cols.length >= 8) {
        results.push({
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

    if (!results.length) {
      throw new Error("No grain data found — PDQ may have changed their table layout.");
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("Scraper error:", error.message);
    res.status(500).json({
      error: "Failed to fetch PDQ Manitoba prices",
      details: error.message,
    });
  }
}
