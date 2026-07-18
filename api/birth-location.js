const { allowCors, sendJson } = require("../server/supabase");

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });

  const query = String(request.query?.q || "").trim();
  if (query.length < 2) return sendJson(response, 400, { error: "Birth city is required" });

  try {
    const searchParams = new URLSearchParams({
      addressdetails: "1",
      format: "jsonv2",
      limit: "1",
      q: query
    });
    const lookupResponse = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams.toString()}`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Intuisity/1.0 (info@intuisity.com)"
      }
    });

    if (!lookupResponse.ok) {
      return sendJson(response, 502, { error: "Location lookup failed" });
    }

    const results = await lookupResponse.json();
    const result = Array.isArray(results) ? results[0] : null;
    const latitude = Number(result?.lat);
    const longitude = Number(result?.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return sendJson(response, 404, { error: "Birth city was not found" });
    }

    sendJson(response, 200, {
      label: result.display_name || query,
      latitude,
      longitude,
      source: "OpenStreetMap Nominatim"
    });
  } catch (error) {
    sendJson(response, 500, { error: "Location lookup failed", message: error.message });
  }
};
