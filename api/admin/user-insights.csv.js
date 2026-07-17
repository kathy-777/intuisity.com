const { allowCors, requireAdminSecret } = require("../_supabase");
const { buildUserInsightsCsv } = require("../_supabase-report");

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;
  if (requireAdminSecret(request, response)) return;
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const csv = await buildUserInsightsCsv({
      endDate: request.query?.endDate,
      startDate: request.query?.startDate
    });
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=\"intuisity-user-insights.csv\"");
    response.status(200).send(csv);
  } catch (error) {
    response.status(500).json({ error: "CSV export failed", message: error.message });
  }
};
