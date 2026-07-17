const supabaseRestVersion = "2026-07-12";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return {
    serviceRoleKey,
    url: url.replace(/\/$/, "")
  };
}

async function supabaseRequest(path, options = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      "X-Client-Info": `intuisity-api/${supabaseRestVersion}`,
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.hint || `Supabase request failed with ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function sendJson(response, status, payload) {
  response.status(status).json(payload);
}

function allowCors(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return true;
  }

  return false;
}

function requireAdminSecret(request, response) {
  const expectedSecret = process.env.INTUISITY_ADMIN_SECRET;
  if (!expectedSecret) {
    return false;
  }

  const providedSecret =
    request.headers["x-intuisity-admin-secret"] ||
    request.query?.adminSecret ||
    request.query?.token;

  if (providedSecret === expectedSecret) {
    return false;
  }

  sendJson(response, 401, { error: "Admin access required" });
  return true;
}

module.exports = {
  allowCors,
  getDateKey,
  normalizeEmail,
  requireAdminSecret,
  sendJson,
  supabaseRequest
};
