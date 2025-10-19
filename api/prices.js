import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const response = await fetch("https://pdqinfo.ca/prices");
    const html = await response.text();
    const $ = cheerio.load(html);

    const data = [];

    // PDQ’s main Manitoba table uses <table class="table"> within a .table-responsive div
    $(".table-responsive table tbody tr").each((_, el) => {
      const tds = $(el).find("td").map((_, td) => $(td).text().trim()).get();

      // Skip header or short rows
      if (tds.length >= 7) {
        data.push({
          location: tds[0],
          wheat: tds[1],
          feedWheat: tds[2],
          canola: tds[3],
          rye: tds[4],
          soybeans: tds[5],
          peas: tds[6],
          oats: tds[7] || "",
        });
      }
    });

    res.setHeader("Cache-Control", "s-maxage=3600");
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch Manitoba PDQ prices",
      details: err.message,
    });
  }
}
