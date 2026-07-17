const { allowCors, normalizeEmail, sendJson, supabaseRequest } = require("./_supabase");

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;
  if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const profile = request.body?.profile || request.body || {};
    const email = normalizeEmail(profile.email);
    if (!email) return sendJson(response, 400, { error: "Profile email is required" });

    await supabaseRequest("/profiles?on_conflict=email", {
      body: JSON.stringify({
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
        current_city: profile.currentCity || "",
        current_state: profile.currentState || "",
        current_country: profile.currentCountry || "",
        profile_json: profile,
        updated_at: new Date().toISOString()
      }),
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      method: "POST"
    });

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { error: "Profile sync failed", message: error.message });
  }
};
