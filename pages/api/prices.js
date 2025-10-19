import axios from "axios";

export default async function handler(req, res) {
  try {
    // PDQ's live JSON endpoint for grain prices
    const url = "https://pdqinfo.ca/api/markets/manitoba";
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    // return directly if data looks fine
    if (Array.isArray(data) || typeof data === "object") {
      return res.status(200).json(data);
    }

    throw new Error("Unexpected response format from PDQ API");
  } catch (error) {
    console.error("PDQ Manitoba fetch failed:", error.message);
    res.status(500).json({
      error: "Failed to fetch PDQ Manitoba prices",
      details: error.message,
    });
  }
}
