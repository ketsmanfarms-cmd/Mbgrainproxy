import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    // Fetch the HTML page that PDQ uses to display Manitoba data
    const { data: html } = await axios.get("https://pdqinfo.ca/markets", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    // Load the HTML
    const $ = cheerio.load(html);

    // Try to locate the Manitoba section
    const manitobaSection = $("section")
      .filter((i, el) => $(el).text().toLowerCase().includes("manitoba"))
      .first();

    if (!manitobaSection.length)
      throw new Error("Couldn't find Manitoba section in PDQ page");

    const rows = [];
    manitobaSection.find("table tbody tr").each((_, el) => {
      const cols = $(el)
        .find("td")
        .map((__, td) => $(td).text().trim())
        .get();

      if (cols.length >= 7) {
        rows.push({
          location: cols[0],
          wheat: cols[1],
          feedWheat: cols[2],
          canola: cols[3],
          rye: cols[4],
          soybeans: cols[5],
          peas: cols[6],
          oats: cols[7] || "",
        });
      }
    });

    if (!rows.length) throw new Error("No Manitoba rows parsed");

    res.setHeader("Cache-Control", "s-maxage=1800");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Scraper failed:", error.message);
    res.status(500).json({
      error: "Failed to fetch PDQ Manitoba prices",
      details: error.message,
    });
  }
}
