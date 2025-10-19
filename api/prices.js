import * as cheerio from "cheerio"; // HTML parser

export default async function handler(req, res) {
  try {
    const endpoint = "https://pdqinfo.ca/prices"; // main Manitoba prices page
    const response = await fetch(endpoint);
    const html = await response.text();
    const $ = cheerio.load(html);

    const data = [];
    $("table tbody tr").each((_, row) => {
      const cols = $(row).find("td").map((_, el) => $(el).text().trim()).get();
      if (cols.length > 1) {
        data.push({
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

    res.setHeader("Cache-Control", "s-maxage=3600");
    res.status(200).json(data.slice(0, 25)); // send top 25 rows
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch PDQ HTML", details: err.message });
  }
            }
