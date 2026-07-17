const { allowCors, requireAdminSecret, sendJson, supabaseRequest } = require("../_supabase");

const requiredTables = [
  "profiles",
  "analytics_events",
  "daily_results",
  "module_feedback",
  "friends"
];

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;
  if (requireAdminSecret(request, response)) return;
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });

  const environment = {
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
    hasResendKey: Boolean(process.env.RESEND_API_KEY),
    hasFromEmail: Boolean(process.env.INTUISITY_FROM_EMAIL)
  };

  const tableChecks = [];
  for (const table of requiredTables) {
    try {
      const rows = await supabaseRequest(`/${table}?select=*&limit=1`);
      tableChecks.push({ ok: true, rowsReturned: Array.isArray(rows) ? rows.length : 0, table });
    } catch (error) {
      tableChecks.push({ ok: false, error: error.message, table });
    }
  }

  const ok = environment.hasSupabaseUrl && environment.hasServiceRoleKey && tableChecks.every((check) => check.ok);
  sendJson(response, ok ? 200 : 500, {
    ok,
    environment,
    tableChecks
  });
};
