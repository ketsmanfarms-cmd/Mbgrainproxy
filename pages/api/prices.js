const cheerio = require("cheerio");

module.exports = async function handler(req, res) {
  try {
    const resp = await fetch("https://pdqinfo.ca/prices");
    const html = await resp.text();
    const $ = cheerio.load(html);

    const rows = [];
    $(".table-responsive table tbody tr").each((_, el) => {
      const tds = $(el)
        .find("td")
        .map((_, td) => $(td).text().trim())
        .get();
      if (tds.length >= 7) {
        rows.push({
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
    res.status(200).json(rows);
  } catch (e) {
    res.status(500).json({ error: "Scrape failed", details: e.message });
  }
};
