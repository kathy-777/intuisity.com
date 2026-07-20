const localBackendUrl = "http://localhost:4000";

function getBackendUrl() {
  const browserWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
  const hostname = browserWindow?.location?.hostname || "";

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return localBackendUrl;
  }

  return "";
}

type BackendAdminReport = {
  totalUsers: number;
  totalVisits: number;
  uniqueVisitors: number;
  visitorVolume: {
    today: number;
    week: number;
    month: number;
    range: number;
  };
  visitorTrend: Array<{
    date: string;
    uniqueVisitors: number;
    visits: number;
  }>;
  moduleDailyTrend: Array<{
    date: string;
    modules: Array<{
      moduleLabel: string;
      activeMs: number;
      totalMs: number;
      visits: number;
    }>;
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalTimeMs: number;
  totalActiveTimeMs: number;
  averageSessionMs: number;
  averageActiveSessionMs: number;
  mostUsedModule: string;
  moduleSummaries: Array<{
    moduleId: string;
    moduleLabel: string;
    visits: number;
    totalMs: number;
    activeMs: number;
    averageMs: number;
    averageActiveMs: number;
  }>;
  feedbackCount: number;
  averageRating: number;
  improvementResponses: Array<{ moduleLabel: string; note: string; rating: number; email: string; savedAt?: string }>;
  userInsights: Array<{
    name: string;
    email: string;
    phone?: string;
    language?: string;
    currentCity?: string;
    currentState?: string;
    currentCountry?: string;
    birthChartType?: string;
    sunSign?: string;
    moonSign?: string;
    risingSign?: string;
    birthLocation?: string;
    totalClicks: number;
    totalTimeMs: number;
    totalActiveTimeMs: number;
    mostClickedModule: string;
    mostClickedCount: number;
    mostTimeModule: string;
    mostTimeMs: number;
    mostActiveModule: string;
    mostActiveMs: number;
    daysWithResults?: number;
    averageScorePercent?: number;
    averageRating?: number;
    commentCount?: number;
    savedFriendCount?: number;
    lastActiveAt?: string;
  }>;
};

const adminSecretStorageKey = "intuisity-admin-secret";
const backendSyncLogKey = "intuisity-backend-sync-log";
let lastDailyAnswersSyncPayload = "";

type BackendSyncLogEntry = {
  path: string;
  ok: boolean;
  status?: number;
  message: string;
  savedAt: string;
};

export function saveAdminSecret(secret: string) {
  try {
    globalThis.localStorage?.setItem(adminSecretStorageKey, secret.trim());
  } catch {
    // Admin reports can still be opened manually with the secret query string.
  }
}

export function loadAdminSecret() {
  try {
    return globalThis.localStorage?.getItem(adminSecretStorageKey) || "";
  } catch {
    return "";
  }
}

export function loadBackendSyncLog(): BackendSyncLogEntry[] {
  try {
    const stored = globalThis.localStorage?.getItem(backendSyncLogKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearBackendSyncLog() {
  try {
    globalThis.localStorage?.removeItem(backendSyncLogKey);
  } catch {
    // The visible report will refresh after the next save attempt.
  }
}

export function backendUserInsightsCsvUrl(adminSecret = loadAdminSecret(), startDate = "", endDate = "") {
  const params = new URLSearchParams();
  if (adminSecret.trim()) params.set("adminSecret", adminSecret.trim());
  if (startDate.trim()) params.set("startDate", startDate.trim());
  if (endDate.trim()) params.set("endDate", endDate.trim());
  const query = params.toString();
  return `${getBackendUrl()}/api/admin/user-insights.csv${query ? `?${query}` : ""}`;
}

export function syncProfile(profile: unknown) {
  postToBackend("/api/profiles", { profile });
}

export async function lookupBirthLocation(query: string): Promise<{ label: string; latitude: number; longitude: number; source?: string } | null> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return null;

  try {
    const response = await fetch(`${getBackendUrl()}/api/birth-location?q=${encodeURIComponent(normalizedQuery)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function syncDailyAnswers(email: string, answers: Record<string, string>) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const payload = JSON.stringify({ email: normalizedEmail, answers, date: getDateKey() });
  if (!normalizedEmail || payload === lastDailyAnswersSyncPayload) {
    return;
  }

  lastDailyAnswersSyncPayload = payload;
  postToBackend("/api/daily-answers", JSON.parse(payload));
}

export function syncDailyResult(
  email: string,
  modules: Array<{ label: string; score: number; maximum: number }>,
  total: number,
  maximum: number
) {
  postToBackend("/api/daily-results", { email, modules, total, maximum, date: getDateKey() });
}

export function syncModuleTime(event: {
  email: string;
  moduleId: string;
  moduleLabel: string;
  startedAt: string;
  durationMs: number;
  activeDurationMs?: number;
  date: string;
}) {
  postToBackend("/api/analytics/module-time", event);
}

export function syncSiteVisit() {
  try {
    const browserWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
    const sessionStorage = browserWindow?.sessionStorage || globalThis.sessionStorage;
    const visitKey = "intuisity-site-visit-recorded";
    if (sessionStorage?.getItem(visitKey)) return;

    const visitorEmail = getAnonymousVisitorEmail();
    const visitedAt = new Date();
    sessionStorage?.setItem(visitKey, "true");
    syncModuleTime({
      activeDurationMs: 1,
      date: getDateKey(),
      durationMs: 1,
      email: visitorEmail,
      moduleId: "site-visit",
      moduleLabel: "Website Visit",
      startedAt: visitedAt.toISOString()
    });
  } catch {
    // Visitor tracking should never interrupt the user experience.
  }
}

export function syncModuleFeedback(email: string, feedback: unknown) {
  postToBackend("/api/module-feedback", { email, feedback, savedAt: new Date().toISOString() });
}

export function syncFriends(email: string, friends: unknown) {
  postToBackend("/api/friends", { email, friends });
}

export async function sendFriendInviteEmail(invite: {
  friendEmail: string;
  friendName: string;
  senderName: string;
  note?: string;
  challengeUrl?: string;
}) {
  const response = await fetch("/api/send-friend-invite", {
    body: JSON.stringify(invite),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const detailMessage =
      error?.details?.message ||
      error?.details?.error ||
      error?.details?.name ||
      error?.message ||
      error?.error ||
      "Invite email could not be sent.";
    throw new Error(detailMessage);
  }

  return response.json();
}

export async function loadBackendAdminReport(adminSecret = loadAdminSecret(), startDate = "", endDate = ""): Promise<BackendAdminReport | null> {
  try {
    const params = new URLSearchParams();
    if (startDate.trim()) params.set("startDate", startDate.trim());
    if (endDate.trim()) params.set("endDate", endDate.trim());
    const query = params.toString();
    const response = await fetch(`${getBackendUrl()}/api/admin/report${query ? `?${query}` : ""}`, {
      headers: adminSecret.trim() ? { "X-Intuisity-Admin-Secret": adminSecret.trim() } : undefined
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function postToBackend(path: string, body: unknown) {
  try {
    const response = await fetch(`${getBackendUrl()}${path}`, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      rememberBackendSync({
        message: payload?.message || payload?.error || `Backend returned ${response.status}`,
        ok: false,
        path,
        status: response.status
      });
      return;
    }
    rememberBackendSync({
      message: "Saved to backend",
      ok: true,
      path,
      status: response.status
    });
  } catch (error) {
    rememberBackendSync({
      message: error instanceof Error ? error.message : "Backend save failed",
      ok: false,
      path
    });
  }
}

function rememberBackendSync(entry: Omit<BackendSyncLogEntry, "savedAt">) {
  try {
    const current = loadBackendSyncLog();
    const next = [{ ...entry, savedAt: new Date().toISOString() }, ...current].slice(0, 12);
    globalThis.localStorage?.setItem(backendSyncLogKey, JSON.stringify(next));
  } catch {
    // The app keeps working with local storage when this browser cannot save diagnostics.
  }
}

function getDateKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function getAnonymousVisitorEmail() {
  const storageKey = "intuisity-anonymous-visitor-id";
  const browserWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
  const storage = browserWindow?.localStorage || globalThis.localStorage;
  let visitorId = storage?.getItem(storageKey) || "";

  if (!visitorId) {
    const randomValue =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    visitorId = randomValue.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
    storage?.setItem(storageKey, visitorId);
  }

  return `visitor-${visitorId.toLowerCase()}@anonymous.intuisity`;
}
