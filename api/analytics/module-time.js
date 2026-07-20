let supabaseHelpers;

try {
  supabaseHelpers = require("../../server/supabase");
} catch {
  supabaseHelpers = require("../_supabase");
}

const { allowCors, normalizeEmail, readJsonBody, sendJson, supabaseRequest } = supabaseHelpers;

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;
  if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const body = await readJsonBody(request);
    const email = normalizeEmail(body.email);
    if (!email) return sendJson(response, 400, { error: "Email is required" });

    const payload = {
      email,
      module_id: body.moduleId || "",
      module_label: body.moduleLabel || "Unknown area",
      started_at: body.startedAt || new Date().toISOString(),
      duration_ms: Number(body.durationMs || 0),
      active_duration_ms: Number(body.activeDurationMs || body.durationMs || 0),
      date: body.date || new Date().toISOString().slice(0, 10),
      event_json: body || {},
      recorded_at: new Date().toISOString()
    };

    try {
      await supabaseRequest("/analytics_events", {
        body: JSON.stringify(payload),
        method: "POST"
      });
    } catch (error) {
      if (!String(error.message || "").includes("active_duration_ms")) {
        throw error;
      }

      const { active_duration_ms, ...legacyPayload } = payload;
      await supabaseRequest("/analytics_events", {
        body: JSON.stringify({
          ...legacyPayload,
          event_json: {
            ...(body || {}),
            activeDurationMs: active_duration_ms,
            activeDurationFallback: true
          }
        }),
        method: "POST"
      });
    }

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { error: "Analytics sync failed", message: error.message });
  }
};
