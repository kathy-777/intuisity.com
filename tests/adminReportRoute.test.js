const assert = require("node:assert/strict");

process.env.INTUISITY_ADMIN_SECRET = "test-admin-secret";

const handler = require("../api/admin/report");

(async () => {
  const result = { statusCode: 0, payload: null };
  const request = { method: "GET", headers: {}, query: {}, url: "/api/admin/report" };
  const response = {
    setHeader() {},
    status(code) { result.statusCode = code; return this; },
    json(payload) { result.payload = payload; return this; },
    end() { return this; }
  };
  await handler(request, response);
  assert.equal(result.statusCode, 401);
  assert.equal(result.payload.error, "Admin access required");
  console.log("Admin report route test passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
