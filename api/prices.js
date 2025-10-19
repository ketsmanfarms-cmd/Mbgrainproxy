export default async function handler(req, res) {
  const endpoint = "https://pdqinfo.ca/api/prices";  // example placeholder
  try {
    const r = await fetch(endpoint);
    const raw = await r.json();

    // 👉 shape the data however you need
    const cleaned = raw.map(item => ({
      date: item.date,
      wheat: item.wheat,
      feedWheat: item.feed_wheat,
      canola: item.canola,
      rye: item.rye,
      soybeans: item.soybeans,
      peas: item.peas,
      oats: item.oats,
    }));

    res.setHeader("Cache-Control", "s-maxage=3600");
    res.status(200).json(cleaned);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch PDQ data", details: err.message });
  }
}
