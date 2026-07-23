const assert = require("node:assert/strict");

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.RESEND_API_KEY = "test-resend-key";
process.env.INTUISITY_FROM_EMAIL = "Intuisity <info@intuisity.com>";

const rows = new Map();
const emails = [];

global.fetch = async (url, options = {}) => {
  if (url === "https://api.resend.com/emails" && options.method === "POST") {
    const message = JSON.parse(options.body);
    emails.push(message);
    return jsonResponse(200, { id: `email-${emails.length}` });
  }
  if (String(url).startsWith("https://api.resend.com/emails/") && options.method === "GET") {
    return jsonResponse(200, { id: String(url).split("/").pop(), last_event: "delivered" });
  }

  const parsed = new URL(url);
  const id = parsed.searchParams.get("id")?.replace("eq.", "");
  if (options.method === "POST") {
    const record = JSON.parse(options.body);
    rows.set(record.id, record);
    return jsonResponse(201, [record]);
  }
  if (options.method === "PATCH") {
    rows.set(id, { ...rows.get(id), ...JSON.parse(options.body) });
    return jsonResponse(200, [rows.get(id)]);
  }
  const competitionId = parsed.searchParams.get("competition_id")?.replace("eq.", "");
  if (competitionId) return jsonResponse(200, [...rows.values()].filter((row) => row.competition_id === competitionId));
  return jsonResponse(200, id && rows.has(id) ? [rows.get(id)] : []);
};

const handler = require("../api/treasure-challenges");

(async () => {
  const competitionId = "11111111-1111-4111-8111-111111111111";
  const created = await call("POST", {}, {
    senderEmail: "Sender@Example.com",
    senderName: "Sender",
    friendEmail: "Friend@Example.com",
    friendName: "Friend",
    tiles: ["one", "two", "three", "four", "five"],
    note: "Trust your instinct",
    origin: "https://intuisity.com",
    competitionId
  });
  assert.equal(created.statusCode, 201);
  assert.equal(emails[0].to, "friend@example.com");
  assert.match(emails[0].html, /challenge=/);

  const id = created.payload.id;
  const opened = await call("POST", {}, { action: "opened", id });
  assert.equal(opened.statusCode, 200);
  assert.equal(emails[1].to, "sender@example.com");
  assert.equal(rows.get(id).status, "opened");

  const completed = await call("POST", {}, { action: "completed", id, answers: ["five", "four", "three", "two", "one"], attempts: 3, solved: true });
  assert.equal(completed.statusCode, 200);
  assert.equal(emails[2].to, "sender@example.com");
  assert.equal(rows.get(id).status, "completed");

  const status = await call("GET", { id, senderToken: created.payload.senderToken });
  assert.equal(status.payload.status, "completed");
  assert.equal(status.payload.emailDeliveryStatus, "delivered");
  assert.ok(status.payload.openedAt);
  assert.ok(status.payload.completedAt);

  const second = await call("POST", {}, {
    senderEmail: "sender@example.com",
    senderName: "Sender",
    friendEmail: "second@example.com",
    friendName: "Second",
    tiles: ["one", "two", "three", "four", "five"],
    origin: "https://intuisity.com",
    competitionId
  });
  await call("POST", {}, { action: "opened", id: second.payload.id });
  await call("POST", {}, { action: "completed", id: second.payload.id, answers: ["one", "two", "three", "four", "five"], attempts: 1, solved: true });
  const secondStatus = await call("GET", { id: second.payload.id, senderToken: second.payload.senderToken });
  assert.equal(secondStatus.payload.playerCount, 2);
  assert.equal(secondStatus.payload.rank, 1, "Two-player matches rank fewer tries first");
  console.log("Treasure challenge tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function jsonResponse(status, payload) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload, text: async () => JSON.stringify(payload) };
}

async function call(method, query, body) {
  const result = { statusCode: 0, payload: null };
  const request = { method, query, url: `/api/treasure-challenges?${new URLSearchParams(query)}`, body };
  const response = {
    setHeader() {},
    status(code) { result.statusCode = code; return this; },
    json(payload) { result.payload = payload; return this; },
    end() { return this; }
  };
  await handler(request, response);
  return result;
}
