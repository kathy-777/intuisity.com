const { allowCors, getDateKey, normalizeEmail, readJsonBody, sendJson, supabaseRequest } = require("./_supabase");

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;
  if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const body = await readJsonBody(request);
    const email = normalizeEmail(body.email);
    if (!email) return sendJson(response, 400, { error: "Email is required" });

    await supabaseRequest("/daily_answers?on_conflict=email,date", {
      body: JSON.stringify({
        email,
        date: body.date || getDateKey(),
        answers: body.answers || {},
        updated_at: new Date().toISOString()
      }),
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      method: "POST"
    });

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { error: "Daily answers sync failed", message: error.message });
  }
};
