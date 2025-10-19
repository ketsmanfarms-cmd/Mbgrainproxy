export default async function handler(req, res) {
  try {
    const endpoint = "https://pdqinfo.ca/data/priceHistory.json"; // PDQ public data file
    const r = await fetch(endpoint);
    const raw = await r.json();

    // PDQ returns an object, so grab the array inside
    const records = raw?.prices || raw?.data || [];

    // Filter to Manitoba & recent 7 days
    const manitoba = records
      .filter(item => item.province === "Manitoba")
      .slice(-7)
      .map(item => ({
        date: item.date || item.tradeDate || item.reportDate,
        wheat: item.wheat || null,
        feedWheat: item.feed_wheat || null,
        canola: item.canola || null,
        rye: item.rye || null,
        soybeans: item.soybeans || null,
        peas: item.peas || null,
        oats: item.oats || null,
      }));

    res.setHeader("Cache-Control", "s-maxage=3600");
    res.status(200).json(manitoba);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch Manitoba PDQ data", details: err.message });
  }
}
