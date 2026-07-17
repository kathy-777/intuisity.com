const { allowCors, normalizeEmail, sendJson, supabaseRequest } = require("../_supabase");

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;
  if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const email = normalizeEmail(request.body?.email);
    if (!email) return sendJson(response, 400, { error: "Email is required" });

    await supabaseRequest("/analytics_events", {
      body: JSON.stringify({
        email,
        module_id: request.body?.moduleId || "",
        module_label: request.body?.moduleLabel || "Unknown area",
        started_at: request.body?.startedAt || new Date().toISOString(),
        duration_ms: Number(request.body?.durationMs || 0),
        active_duration_ms: Number(request.body?.activeDurationMs || request.body?.durationMs || 0),
        date: request.body?.date || new Date().toISOString().slice(0, 10),
        event_json: request.body || {},
        recorded_at: new Date().toISOString()
      }),
      method: "POST"
    });

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { error: "Analytics sync failed", message: error.message });
  }
};
