const crypto = require("node:crypto");
const { allowCors, normalizeEmail, readJsonBody, sendJson, supabaseRequest } = require("../server/supabase");

const resendApiUrl = "https://api.resend.com/emails";

module.exports = async function handler(request, response) {
  if (allowCors(request, response)) return;

  try {
    if (request.method === "GET") return getChallenge(request, response);
    if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });

    const body = await readJsonBody(request);
    if (body.action === "opened") return markOpened(body, response);
    if (body.action === "completed") return markCompleted(body, response);
    return createChallenge(body, response);
  } catch (error) {
    console.error("treasure_challenge_request_failed", {
      message: error instanceof Error ? error.message : String(error),
      method: request.method
    });
    return sendJson(response, 500, { error: "Treasure challenge request failed", message: safeError(error) });
  }
};

async function createChallenge(body, response) {
  const senderEmail = normalizeEmail(body.senderEmail);
  const friendEmail = normalizeEmail(body.friendEmail);
  const senderName = cleanText(body.senderName, "A friend");
  const friendName = cleanText(body.friendName, "friend");
  const note = cleanText(body.note, "");
  const tiles = Array.isArray(body.tiles) ? body.tiles.map(String).slice(0, 5) : [];
  const origin = validOrigin(body.origin) || "https://intuisity.com";
  const competitionId = validUuid(body.competitionId) ? body.competitionId : crypto.randomUUID();

  if (!validEmail(senderEmail) || !validEmail(friendEmail)) {
    return sendJson(response, 400, { error: "Valid sender and friend email addresses are required" });
  }
  if (tiles.length !== 5 || tiles.some((tile) => !tile)) {
    return sendJson(response, 400, { error: "Five treasure tiles are required" });
  }

  requireEmailConfig();
  const id = crypto.randomUUID();
  const senderToken = crypto.randomBytes(24).toString("hex");
  const now = new Date().toISOString();
  const challengeUrl = `${origin}/?treasureInvite=1&challenge=${encodeURIComponent(id)}`;

  await supabaseRequest("/treasure_challenges", {
    method: "POST",
    body: JSON.stringify({
      id,
      competition_id: competitionId,
      sender_token: senderToken,
      sender_email: senderEmail,
      sender_name: senderName,
      friend_email: friendEmail,
      friend_name: friendName,
      tiles,
      note,
      status: "sent",
      sent_at: now,
      updated_at: now
    })
  });

  try {
    const deliveryId = await sendEmail({
      to: friendEmail,
      subject: `${senderName} invited you to Intuisity`,
      html: inviteHtml({ challengeUrl, friendName, note, senderName }),
      text: `Hi ${friendName},\n\n${senderName} invited you to a Treasure Chest challenge.\n\n${note ? `${note}\n\n` : ""}Open it here: ${challengeUrl}`
    });
    await updateChallenge(id, { invite_delivery_id: deliveryId, updated_at: new Date().toISOString() });
    console.info("treasure_challenge_invite_sent", { challengeId: id, deliveryId, recipient: maskEmail(friendEmail) });
  } catch (error) {
    await updateChallenge(id, { email_error: safeError(error), updated_at: new Date().toISOString() }).catch(() => {});
    throw error;
  }

  return sendJson(response, 201, { id, senderToken, status: "sent" });
}

async function getChallenge(request, response) {
  const id = String(request.query?.id || new URL(request.url || "", "https://intuisity.com").searchParams.get("id") || "");
  const senderToken = String(request.query?.senderToken || new URL(request.url || "", "https://intuisity.com").searchParams.get("senderToken") || "");
  if (!id) return sendJson(response, 400, { error: "Challenge id is required" });
  const rows = await supabaseRequest(`/treasure_challenges?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  const row = rows?.[0];
  if (!row) return sendJson(response, 404, { error: "Challenge not found" });

  if (senderToken && senderToken === row.sender_token) {
    if (row.invite_delivery_id) {
      try {
        const latestDeliveryStatus = await getEmailDeliveryStatus(row.invite_delivery_id);
        if (latestDeliveryStatus && latestDeliveryStatus !== row.invite_delivery_status) {
          row.invite_delivery_status = latestDeliveryStatus;
          await updateChallenge(row.id, { invite_delivery_status: latestDeliveryStatus, updated_at: new Date().toISOString() });
        }
      } catch (error) {
        console.warn("treasure_invite_delivery_check_failed", { challengeId: row.id, message: safeError(error) });
      }
    }
    const competitionRows = row.competition_id
      ? await supabaseRequest(`/treasure_challenges?competition_id=eq.${encodeURIComponent(row.competition_id)}&select=*`)
      : [row];
    return sendJson(response, 200, publicStatus(row, rankCompetition(competitionRows)));
  }
  return sendJson(response, 200, {
    id: row.id,
    senderName: row.sender_name,
    friendName: row.friend_name,
    tiles: row.tiles,
    note: row.note,
    status: row.status
  });
}

async function markOpened(body, response) {
  const row = await findChallenge(body.id);
  if (!row) return sendJson(response, 404, { error: "Challenge not found" });
  if (row.opened_at) return sendJson(response, 200, { ok: true, status: row.status });

  const openedAt = new Date().toISOString();
  let deliveryId = row.opened_delivery_id || null;
  let emailError = null;
  try {
    deliveryId = await sendEmail({
      to: row.sender_email,
      subject: `${row.friend_name || "Your friend"} opened your Treasure Chest`,
      html: statusHtml(`${row.friend_name || "Your friend"} opened your shared Treasure Chest challenge.`, "Opened"),
      text: `${row.friend_name || "Your friend"} opened your shared Intuisity Treasure Chest challenge.`
    });
  } catch (error) {
    emailError = safeError(error);
  }
  await updateChallenge(row.id, {
    status: "opened",
    opened_at: openedAt,
    opened_delivery_id: deliveryId,
    email_error: emailError,
    updated_at: openedAt
  });
  console.info("treasure_challenge_opened", { challengeId: row.id, deliveryId, recipient: maskEmail(row.sender_email), emailError });
  if (emailError) return sendJson(response, 502, { error: "Opened status saved, but notification email failed", details: emailError, statusSaved: true });
  return sendJson(response, 200, { ok: true, status: "opened" });
}

async function markCompleted(body, response) {
  const row = await findChallenge(body.id);
  if (!row) return sendJson(response, 404, { error: "Challenge not found" });
  const answers = Array.isArray(body.answers) ? body.answers.map(String).slice(0, 5) : [];
  if (answers.length !== 5 || answers.some((answer) => !answer)) {
    return sendJson(response, 400, { error: "Five submitted answers are required" });
  }

  const completedAt = row.completed_at || new Date().toISOString();
  const solved = Boolean(body.solved) || Boolean(row.solved);
  const solvedAt = solved ? (row.solved_at || new Date().toISOString()) : null;
  const attempts = Math.max(Number(row.attempt_count || 0), Math.min(4, Math.max(1, Number(body.attempts || 1))));
  const startedAt = new Date(row.opened_at || row.sent_at || completedAt).getTime();
  const durationMs = solvedAt ? Math.max(0, new Date(solvedAt).getTime() - startedAt) : null;
  let deliveryId = row.completed_delivery_id || null;
  let emailError = null;
  try {
    if (!row.completed_at) {
    deliveryId = await sendEmail({
      to: row.sender_email,
      subject: `${row.friend_name || "Your friend"} completed your Treasure Chest`,
      html: statusHtml(`${row.friend_name || "Your friend"} locked in and submitted their Treasure Chest answers.`, "Completed"),
      text: `${row.friend_name || "Your friend"} locked in and submitted their Intuisity Treasure Chest answers.`
    });
    }
  } catch (error) {
    emailError = safeError(error);
  }
  await updateChallenge(row.id, {
    status: "completed",
    response_tiles: answers,
    attempt_count: attempts,
    solved,
    solved_at: solvedAt,
    completion_duration_ms: durationMs,
    completed_at: completedAt,
    completed_delivery_id: deliveryId,
    email_error: emailError,
    updated_at: new Date().toISOString()
  });
  console.info("treasure_challenge_completed", { challengeId: row.id, deliveryId, recipient: maskEmail(row.sender_email), emailError });
  if (emailError) return sendJson(response, 502, { error: "Answers saved, but notification email failed", details: emailError, statusSaved: true });
  return sendJson(response, 200, { ok: true, status: "completed" });
}

async function findChallenge(id) {
  const cleanId = String(id || "");
  if (!cleanId) return null;
  const rows = await supabaseRequest(`/treasure_challenges?id=eq.${encodeURIComponent(cleanId)}&select=*&limit=1`);
  return rows?.[0] || null;
}

function updateChallenge(id, values) {
  return supabaseRequest(`/treasure_challenges?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(values) });
}

async function sendEmail(message) {
  requireEmailConfig();
  const fromEmail = process.env.INTUISITY_FROM_EMAIL || "Intuisity <admin@intuisity.com>";
  const result = await fetch(resendApiUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromEmail, to: [message.to], ...message })
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(payload?.message || payload?.error || `Email provider returned ${result.status}`);
  return payload.id || null;
}

async function getEmailDeliveryStatus(deliveryId) {
  requireEmailConfig();
  const result = await fetch(`${resendApiUrl}/${encodeURIComponent(deliveryId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(payload?.message || payload?.error || `Email status provider returned ${result.status}`);
  return String(payload.last_event || "sent");
}

function requireEmailConfig() {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
}

function publicStatus(row, leaderboard = []) {
  const ranked = leaderboard.find((entry) => entry.id === row.id);
  return { id: row.id, friendName: row.friend_name, friendEmail: row.friend_email, status: row.status, sentAt: row.sent_at, openedAt: row.opened_at, completedAt: row.completed_at, emailError: row.email_error || null, emailDeliveryStatus: row.invite_delivery_status || "sent", attempts: Number(row.attempt_count || 0), solved: Boolean(row.solved), durationMs: row.completion_duration_ms == null ? null : Number(row.completion_duration_ms), rank: ranked?.rank, playerCount: leaderboard.length };
}

function rankCompetition(rows) {
  const playerCount = rows.length;
  return [...rows]
    .sort((a, b) => {
      if (Boolean(a.solved) !== Boolean(b.solved)) return a.solved ? -1 : 1;
      if (!a.solved && !b.solved) return Number(a.attempt_count || 0) - Number(b.attempt_count || 0);
      if (playerCount === 2) return Number(a.attempt_count || 99) - Number(b.attempt_count || 99) || Number(a.completion_duration_ms || Infinity) - Number(b.completion_duration_ms || Infinity);
      return Number(a.completion_duration_ms || Infinity) - Number(b.completion_duration_ms || Infinity) || Number(a.attempt_count || 99) - Number(b.attempt_count || 99);
    })
    .map((row, index) => ({ id: row.id, rank: index + 1 }));
}

function inviteHtml({ challengeUrl, friendName, note, senderName }) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#30264C;max-width:560px"><h1 style="color:#6544B8">You have an Intuisity invite</h1><p>Hi ${escapeHtml(friendName)},</p><p>${escapeHtml(senderName)} invited you to try a Treasure Chest challenge.</p>${note ? `<p style="padding:12px;border-left:4px solid #00AEBB;background:#F2FAFA">${escapeHtml(note)}</p>` : ""}<p><a href="${escapeHtml(challengeUrl)}" style="background:#6544B8;color:#fff;display:inline-block;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open Treasure Chest</a></p></div>`;
}

function statusHtml(message, status) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#30264C;max-width:560px"><h1 style="color:#6544B8">Treasure Chest: ${status}</h1><p>${escapeHtml(message)}</p><p>You can also see the latest status inside Intuisity.</p></div>`;
}

function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function validUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "")); }
function validOrigin(value) { try { const url = new URL(String(value || "")); return /^https?:$/.test(url.protocol) ? url.origin : ""; } catch { return ""; } }
function cleanText(value, fallback) { return String(value || fallback).trim().slice(0, 1000) || fallback; }
function safeError(error) { return (error instanceof Error ? error.message : String(error)).slice(0, 500); }
function maskEmail(email) { const [name, domain] = String(email || "").split("@"); return name && domain ? `${name.slice(0, 2)}***@${domain}` : "invalid"; }
function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
