const { allowCors, requireAdminSecret, sendJson } = require("../_supabase");
const { buildAdminReport } = require("../_supabase-report");

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;
  if (requireAdminSecret(request, response)) return;
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    sendJson(response, 200, await buildAdminReport({
      endDate: request.query?.endDate,
      startDate: request.query?.startDate
    }));
  } catch (error) {
    sendJson(response, 500, { error: "Admin report failed", message: error.message });
  }
};
