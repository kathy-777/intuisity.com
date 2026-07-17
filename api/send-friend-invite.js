const resendApiUrl = "https://api.resend.com/emails";
const { readJsonBody } = require("./_supabase");

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    response.status(204).end();
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", "*");

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INTUISITY_FROM_EMAIL || "Intuisity <info@intuisity.com>";

  if (!apiKey) {
    response.status(500).json({ error: "Missing RESEND_API_KEY" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const friendEmail = String(body.friendEmail || "").trim().toLowerCase();
    const friendName = String(body.friendName || "friend").trim() || "friend";
    const senderName = String(body.senderName || "A friend").trim() || "A friend";
    const note = String(body.note || "").trim();
    const challengeUrl = String(body.challengeUrl || "https://intuisity.com").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(friendEmail)) {
      response.status(400).json({ error: "Valid friendEmail is required" });
      return;
    }

    const intro = `${senderName} invited you to try a short Intuisity Treasure Chest challenge.`;
    const noteHtml = note ? `<p style="margin:16px 0;padding:12px;border-left:4px solid #00AEBB;background:#F2FAFA;">${escapeHtml(note)}</p>` : "";

    const resendResponse = await fetch(resendApiUrl, {
      body: JSON.stringify({
        from: fromEmail,
        to: [friendEmail],
        subject: `${senderName} invited you to Intuisity`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#30264C;max-width:560px;">
            <h1 style="color:#6544B8;">You have an Intuisity invite</h1>
            <p>Hi ${escapeHtml(friendName)},</p>
            <p>${escapeHtml(intro)}</p>
            ${noteHtml}
            <p>Open the challenge here:</p>
            <p><a href="${escapeHtml(challengeUrl)}" style="background:#6544B8;color:#ffffff;display:inline-block;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">Open Intuisity</a></p>
            <p style="font-size:13px;color:#706982;">Intuisity helps you explore awareness, inner knowing, mindfulness, synchronicity, and remote viewing through daily practice.</p>
          </div>
        `,
        text: `Hi ${friendName},\n\n${intro}\n\n${note ? `${note}\n\n` : ""}Open the challenge here: ${challengeUrl}\n\nIntuisity helps you explore awareness, inner knowing, mindfulness, synchronicity, and remote viewing through daily practice.`
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    const result = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      response.status(resendResponse.status).json({ error: "Resend send failed", details: result });
      return;
    }

    response.status(200).json({ ok: true, id: result.id });
  } catch (error) {
    response.status(500).json({
      error: "Invite email failed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
