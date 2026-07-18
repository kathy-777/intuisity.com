const { allowCors, normalizeEmail, readJsonBody, sendJson, supabaseRequest } = require("../server/supabase");

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;
  if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const body = await readJsonBody(request);
    const email = normalizeEmail(body.email);
    if (!email) return sendJson(response, 400, { error: "Email is required" });

    await supabaseRequest("/friends?on_conflict=email", {
      body: JSON.stringify({
        email,
        friends: body.friends || [],
        updated_at: new Date().toISOString()
      }),
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      method: "POST"
    });

    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 500, { error: "Friends sync failed", message: error.message });
  }
};
