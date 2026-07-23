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
  platformBreakdown: Array<{
    channel: string;
    label: string;
    visits: number;
    uniqueVisitors: number;
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
  visitorInsights: Array<{
    key: string;
    name: string;
    email?: string;
    visitorId?: string;
    platform: string;
    visits: number;
    firstSeenAt?: string;
    lastSeenAt?: string;
  }>;
  userInsights: Array<{
    name: string;
    email: string;
    phone?: string;
    language?: string;
    currentCity?: string;
    currentState?: string;
    currentCountry?: string;
    age?: number | null;
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
let lastAdminReportError = "";

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

export async function fetchSavedProfile(email: string) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  try {
    const response = await fetch(`${getBackendUrl()}/api/profiles?email=${encodeURIComponent(normalizedEmail)}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.profile || null;
  } catch {
    return null;
  }
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
  clientChannel?: string;
  deviceCategory?: string;
}) {
  postToBackend("/api/analytics/module-time", {
    ...getClientPlatformDetails(),
    ...event
  });
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

export type TreasureChallengeStatus = "sent" | "opened" | "completed";

export type TreasureChallengeReceipt = {
  id: string;
  senderToken: string;
  friendName: string;
  friendEmail: string;
  status: TreasureChallengeStatus;
  sentAt?: string;
  openedAt?: string;
  completedAt?: string;
  emailError?: string | null;
  emailDeliveryStatus?: string;
  attempts?: number;
  solved?: boolean;
  durationMs?: number | null;
  rank?: number;
  playerCount?: number;
};

export async function createTreasureChallenge(invite: {
  friendEmail: string;
  friendName: string;
  senderEmail: string;
  senderName: string;
  tiles: string[];
  note?: string;
  origin?: string;
  competitionId?: string;
}): Promise<{ id: string; senderToken: string; status: TreasureChallengeStatus }> {
  return treasureChallengeRequest("", invite, "POST");
}

export async function markTreasureChallengeOpened(id: string) {
  return treasureChallengeRequest("", { action: "opened", id }, "POST");
}

export async function completeTreasureChallenge(id: string, answers: string[], attempts: number, solved: boolean) {
  return treasureChallengeRequest("", { action: "completed", answers, attempts, id, solved }, "POST");
}

export async function fetchTreasureChallenge(id: string, senderToken = "") {
  const params = new URLSearchParams({ id });
  if (senderToken) params.set("senderToken", senderToken);
  return treasureChallengeRequest(`?${params.toString()}`, undefined, "GET");
}

async function treasureChallengeRequest(query: string, body: unknown, method: "GET" | "POST") {
  const response = await fetch(`/api/treasure-challenges${query}`, {
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: { "Content-Type": "application/json" },
    method
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const detailMessage =
      error?.details?.message ||
      error?.details?.error ||
      error?.details?.name ||
      error?.message ||
      error?.error ||
      "Treasure challenge request failed.";
    throw new Error(detailMessage);
  }

  return response.json();
}

export async function loadBackendAdminReport(adminSecret = loadAdminSecret(), startDate = "", endDate = ""): Promise<BackendAdminReport | null> {
  try {
    lastAdminReportError = "";
    const params = new URLSearchParams();
    if (startDate.trim()) params.set("startDate", startDate.trim());
    if (endDate.trim()) params.set("endDate", endDate.trim());
    params.set("_", String(Date.now()));
    const query = params.toString();
    const response = await fetch(`${getBackendUrl()}/api/admin/report${query ? `?${query}` : ""}`, {
      cache: "no-store",
      headers: {
        ...(adminSecret.trim() ? { "X-Intuisity-Admin-Secret": adminSecret.trim() } : {}),
        "Cache-Control": "no-cache"
      }
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        lastAdminReportError = "The admin report password does not match the password saved in Vercel.";
      } else if (response.status === 404) {
        lastAdminReportError = "The Admin reporting function has not been deployed yet.";
      } else if (response.status >= 500) {
        lastAdminReportError = payload?.message || payload?.error || "The live reporting function failed on Vercel.";
      } else {
        lastAdminReportError = payload?.message || payload?.error || `The Admin report returned status ${response.status}.`;
      }
      return null;
    }
    return await response.json();
  } catch (error) {
    lastAdminReportError = error instanceof Error ? error.message : "The Admin report request could not connect.";
    return null;
  }
}

export function getLastAdminReportError() {
  return lastAdminReportError;
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

function getClientPlatformDetails() {
  const browserWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
  const navigatorRef = typeof globalThis !== "undefined" ? (globalThis as any).navigator : undefined;
  const userAgent = String(navigatorRef?.userAgent || "");
  const isStandalone = Boolean(
    browserWindow?.matchMedia?.("(display-mode: standalone)")?.matches ||
    (navigatorRef as any)?.standalone
  );
  const appChannel = (globalThis as any).Expo || (navigatorRef as any)?.product === "ReactNative" || isStandalone;
  const mobileWeb = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

  return {
    clientChannel: appChannel ? "app" : mobileWeb ? "mobile-web" : "desktop-web",
    deviceCategory: appChannel ? "App" : mobileWeb ? "Mobile Web" : "Desktop Web",
    userAgent: userAgent.slice(0, 500),
    isLikelyBot: Boolean(navigatorRef?.webdriver) || isLikelyBotUserAgent(userAgent)
  };
}

function isLikelyBotUserAgent(userAgent: string) {
  return /bot|crawler|spider|headless|slurp|bingpreview|facebookexternalhit|whatsapp|discordbot|telegrambot|lighthouse|pagespeed|google-inspectiontool|semrush|ahrefs|mj12bot|dotbot|petalbot|yandex|baidu|duckduckbot|applebot|uptimerobot|vercel-screenshot/i.test(userAgent);
}
