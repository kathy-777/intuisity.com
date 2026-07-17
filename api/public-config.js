const { allowCors, sendJson } = require("./_supabase");

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });

  sendJson(response, 200, {
    googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ""
  });
};
