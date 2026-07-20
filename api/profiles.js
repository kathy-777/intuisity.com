const { allowCors, normalizeEmail, readJsonBody, sendJson, supabaseRequest } = require("./_supabase");

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;
  if (request.method === "GET") return getProfile(request, response);
  if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const body = await readJsonBody(request);
    const profile = body.profile || body || {};
    const email = normalizeEmail(profile.email);
    if (!email) return sendJson(response, 400, { error: "Profile email is required" });

    const payload = {
      email,
      name: profile.name || "",
      phone: profile.phone || "",
      language: profile.language || "en",
      reminder_time: profile.reminderTime || "9:00 AM",
      time_zone: profile.timeZone || "",
      birthdate: profile.birthdate || "",
      birth_time: profile.birthTime || "",
      birth_city: profile.birthCity || "",
      birth_state: profile.birthState || "",
      birth_country: profile.birthCountry || "",
      birth_latitude: Number.isFinite(profile.birthLatitude) ? profile.birthLatitude : null,
      birth_longitude: Number.isFinite(profile.birthLongitude) ? profile.birthLongitude : null,
      birth_location_label: profile.birthLocationLabel || profile.birthChart?.locationLabel || "",
      birth_chart_json: profile.birthChart || {},
      birth_chart_type: profile.birthChart?.calculationType || "",
      sun_sign: profile.birthChart?.sunSign || "",
      moon_sign: profile.birthChart?.moonSign || "",
      rising_sign: profile.birthChart?.risingSign || "",
      midheaven_sign: profile.birthChart?.midheavenSign || "",
      strongest_aspect: profile.birthChart?.strongestAspect || "",
      current_city: profile.currentCity || "",
      current_state: profile.currentState || "",
      current_country: profile.currentCountry || "",
      profile_json: profile,
      updated_at: new Date().toISOString()
    };

    try {
      await upsertProfile(payload);
    } catch (error) {
      if (!String(error.message || "").includes("birth_") && !String(error.message || "").includes("sun_sign")) {
        throw error;
      }

      const legacyPayload = { ...payload };
      [
        "birth_latitude",
        "birth_longitude",
        "birth_location_label",
        "birth_chart_json",
        "birth_chart_type",
        "sun_sign",
        "moon_sign",
        "rising_sign",
        "midheaven_sign",
        "strongest_aspect"
      ].forEach((key) => delete legacyPayload[key]);
      await upsertProfile(legacyPayload);
    }

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { error: "Profile sync failed", message: error.message });
  }
};

async function getProfile(request, response) {
  try {
    const queryEmail = request.query?.email || new URL(request.url || "", "https://intuisity.com").searchParams.get("email");
    const email = normalizeEmail(queryEmail);
    if (!email) return sendJson(response, 400, { error: "Profile email is required" });

    const rows = await supabaseRequest(`/profiles?email=eq.${encodeURIComponent(email)}&select=*&limit=1`);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return sendJson(response, 404, { error: "Profile not found" });

    sendJson(response, 200, { ok: true, profile: toUserProfile(row) });
  } catch (error) {
    sendJson(response, 500, { error: "Profile lookup failed", message: error.message });
  }
}

function upsertProfile(payload) {
  return supabaseRequest("/profiles?on_conflict=email", {
      body: JSON.stringify(payload),
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      method: "POST"
    });
}

function toUserProfile(row) {
  const profileJson = row.profile_json && typeof row.profile_json === "object" ? row.profile_json : {};
  return {
    ...profileJson,
    email: row.email || profileJson.email || "",
    name: row.name || profileJson.name || "",
    phone: row.phone || profileJson.phone || "",
    language: row.language || profileJson.language || "en",
    reminderTime: row.reminder_time || profileJson.reminderTime || "9:00 AM",
    timeZone: row.time_zone || profileJson.timeZone || "",
    birthdate: row.birthdate || profileJson.birthdate || "",
    birthTime: row.birth_time || profileJson.birthTime || "",
    birthCity: row.birth_city || profileJson.birthCity || "",
    birthState: row.birth_state || profileJson.birthState || "",
    birthCountry: row.birth_country || profileJson.birthCountry || "",
    birthLatitude: row.birth_latitude ?? profileJson.birthLatitude,
    birthLongitude: row.birth_longitude ?? profileJson.birthLongitude,
    birthLocationLabel: row.birth_location_label || profileJson.birthLocationLabel || "",
    birthChart: profileJson.birthChart || row.birth_chart_json || undefined,
    currentCity: row.current_city || profileJson.currentCity || "",
    currentState: row.current_state || profileJson.currentState || "",
    currentCountry: row.current_country || profileJson.currentCountry || "",
    passwordHash: profileJson.passwordHash || "",
    authProvider: profileJson.authProvider || (profileJson.passwordHash ? "password" : "google")
  };
}
