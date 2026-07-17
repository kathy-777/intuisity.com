const { allowCors, normalizeEmail, sendJson, supabaseRequest } = require("./_supabase");

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;
  if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const email = normalizeEmail(request.body?.email);
    if (!email) return sendJson(response, 400, { error: "Email is required" });

    const savedAt = request.body?.savedAt || new Date().toISOString();
    const rows = Object.entries(request.body?.feedback || {}).flatMap(([moduleLabel, value]) => {
      const rating = Number(value?.rating || 0);
      const improvement = String(value?.improvement || "").trim();
      if (!rating && !improvement) return [];
      return [{
        email,
        module_label: moduleLabel,
        rating,
        improvement,
        saved_at: value?.updatedAt || savedAt
      }];
    });

    if (rows.length) {
      await supabaseRequest("/module_feedback?on_conflict=email,module_label", {
        body: JSON.stringify(rows),
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        method: "POST"
      });
    }

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { error: "Module feedback sync failed", message: error.message });
  }
};
