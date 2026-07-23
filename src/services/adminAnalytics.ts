import { syncModuleTime } from "./backendApi";

export type AnalyticsEvent = {
  email: string;
  moduleId: string;
  moduleLabel: string;
  startedAt: string;
  durationMs: number;
  activeDurationMs?: number;
  date: string;
  clientChannel?: string;
  deviceCategory?: string;
};

export type ModuleAnalyticsSummary = {
  moduleId: string;
  moduleLabel: string;
  visits: number;
  totalMs: number;
  activeMs: number;
  averageMs: number;
  averageActiveMs: number;
};

export type AdminAnalyticsReport = {
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
  moduleSummaries: ModuleAnalyticsSummary[];
  feedbackCount: number;
  averageRating: number;
  improvementResponses: Array<{ moduleLabel: string; note: string; rating: number; email: string; savedAt?: string }>;
  userInsights: UserInsightReport[];
  visitorInsights: VisitorInsightReport[];
};

export type VisitorInsightReport = {
  key: string;
  name: string;
  email?: string;
  visitorId?: string;
  platform: string;
  visits: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
};

export type UserInsightReport = {
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
};

const analyticsKey = "intuisity-admin-analytics-events";
const profilesKey = "intuisity-user-profiles";
const maxStoredEvents = 1200;
const activeGraceMs = 60000;
const excludedReportEmails = new Set(["admin@intuisity.com", "kathy@intuisity.com"]);
let lastInteractionAt = Date.now();
let activityTrackingStarted = false;

export const moduleLabels: Record<string, string> = {
  "social-prediction": "Challenge 1: Treasure Chest",
  knowing: "Challenge 2: Train Your Knowing",
  "knowing-results": "Challenge 2: Train Your Knowing",
  "remote-viewing-arena": "Challenge 3: Positivity Practice",
  "third-eye-activation": "Challenge 4: Read the Person",
  "psychic-potential-score": "Challenge 5: Daily Astrology Tips",
  "remote-viewing-test": "Challenge 6: Remote Viewing Challenge",
  "remote-viewing-results": "Challenge 6: Remote Viewing Challenge",
  "daily-results": "Results Page"
};

const moduleOrder = [
  "Challenge 1: Treasure Chest",
  "Challenge 2: Train Your Knowing",
  "Challenge 3: Positivity Practice",
  "Challenge 4: Read the Person",
  "Challenge 5: Daily Astrology Tips",
  "Challenge 6: Remote Viewing Challenge",
  "Results Page"
];

export function recordModuleTime(email: string, page: string, startedAt: number, endedAt: number) {
  const moduleLabel = moduleLabels[page];
  const durationMs = endedAt - startedAt;
  if (!moduleLabel || durationMs < 1000) return;
  const activeDurationMs = calculateActiveDuration(startedAt, endedAt);

  const nextEvent: AnalyticsEvent = {
    email: email.toLowerCase(),
    moduleId: page,
    moduleLabel,
    startedAt: new Date(startedAt).toISOString(),
    durationMs,
    activeDurationMs,
    ...getClientPlatformDetails(),
    date: getDateKey(startedAt)
  };

  const events = loadAnalyticsEvents();
  const trimmed = [...events, nextEvent].slice(-maxStoredEvents);
  globalThis.localStorage?.setItem(analyticsKey, JSON.stringify(trimmed));
  syncModuleTime(nextEvent);
}

export function startActivityTracking() {
  if (activityTrackingStarted) return;
  activityTrackingStarted = true;
  markAnalyticsActivity();

  const browserWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
  const documentRef = typeof globalThis !== "undefined" ? (globalThis as any).document : undefined;
  const events = ["pointerdown", "keydown", "wheel", "scroll", "touchstart"];

  events.forEach((eventName) => {
    browserWindow?.addEventListener?.(eventName, markAnalyticsActivity, { passive: true });
    documentRef?.addEventListener?.(eventName, markAnalyticsActivity, { passive: true });
  });
  documentRef?.addEventListener?.("visibilitychange", () => {
    if (!documentRef.hidden) markAnalyticsActivity();
  });
}

export function markAnalyticsActivity() {
  lastInteractionAt = Date.now();
}

export function loadAdminAnalyticsReport(startDate = "", endDate = ""): AdminAnalyticsReport {
  const allProfiles = loadProfiles().filter((profile) => !isExcludedReportEmail(String(profile.email || "")));
  const allEvents = loadAnalyticsEvents().filter((event) => !isExcludedReportEmail(event.email));
  const dateRange = normalizeDateRange(startDate, endDate);
  const visitorEvents = buildLocalVisitorEvents(allEvents, allProfiles);
  const events = filterEventsByDateRange(allEvents, dateRange).filter((event) => !isVisitorOnlyEvent(event));
  const rangedVisitorEvents = filterEventsByDateRange(visitorEvents, dateRange);
  const moduleTotals = new Map<string, ModuleAnalyticsSummary>();

  events.forEach((event) => {
    const current = moduleTotals.get(event.moduleLabel) || {
      moduleId: event.moduleId,
      moduleLabel: event.moduleLabel,
      visits: 0,
      totalMs: 0,
      activeMs: 0,
      averageMs: 0,
      averageActiveMs: 0
    };
    current.visits += 1;
    current.totalMs += event.durationMs;
    current.activeMs += getEventActiveMs(event);
    current.averageMs = Math.round(current.totalMs / current.visits);
    current.averageActiveMs = Math.round(current.activeMs / current.visits);
    moduleTotals.set(event.moduleLabel, current);
  });

  const moduleSummaries = [...moduleTotals.values()].sort(
    (a, b) => moduleOrder.indexOf(a.moduleLabel) - moduleOrder.indexOf(b.moduleLabel)
  );
  const busiest = [...moduleSummaries].sort((a, b) => b.activeMs - a.activeMs || b.totalMs - a.totalMs)[0];
  const feedback = loadFeedbackReport();
  const totalTimeMs = events.reduce((total, event) => total + event.durationMs, 0);
  const totalActiveTimeMs = events.reduce((total, event) => total + getEventActiveMs(event), 0);

  return {
    totalUsers: allProfiles.length,
    totalVisits: events.length,
    uniqueVisitors: countUniqueVisitors(rangedVisitorEvents),
    visitorVolume: buildVisitorVolume(visitorEvents, dateRange),
    visitorTrend: buildVisitorTrend(rangedVisitorEvents),
    platformBreakdown: buildPlatformBreakdown(rangedVisitorEvents),
    moduleDailyTrend: buildModuleDailyTrend(events),
    dateRange,
    totalTimeMs,
    totalActiveTimeMs,
    averageSessionMs: events.length ? Math.round(totalTimeMs / events.length) : 0,
    averageActiveSessionMs: events.length ? Math.round(totalActiveTimeMs / events.length) : 0,
    mostUsedModule: busiest?.moduleLabel || "No module activity yet",
    moduleSummaries,
    feedbackCount: feedback.feedbackCount,
    averageRating: feedback.averageRating,
    improvementResponses: feedback.improvementResponses,
    userInsights: buildLocalUserInsights(events),
    visitorInsights: buildLocalVisitorInsights(rangedVisitorEvents, allProfiles)
  };
}

function buildLocalVisitorInsights(events: AnalyticsEvent[], profiles: Array<Record<string, any>>): VisitorInsightReport[] {
  const profileByEmail = new Map(profiles.map((profile) => [String(profile.email || "").toLowerCase(), profile]));
  const visitors = new Map<string, VisitorInsightReport>();

  events.forEach((event) => {
    const email = String(event.email || "").trim().toLowerCase();
    if (!email) return;
    const anonymous = email.endsWith("@anonymous.intuisity");
    const profile = anonymous ? undefined : profileByEmail.get(email);
    const current = visitors.get(email) || {
      key: email,
      name: profile?.name || (anonymous ? "Anonymous visitor" : "Signed-in visitor"),
      email: anonymous ? "" : email,
      visitorId: anonymous ? email.split("@")[0] : "",
      platform: getLocalPlatformLabel(event.clientChannel || event.deviceCategory || ""),
      visits: 0,
      firstSeenAt: event.startedAt,
      lastSeenAt: event.startedAt
    };
    current.visits += 1;
    if (event.startedAt && (!current.firstSeenAt || event.startedAt < current.firstSeenAt)) current.firstSeenAt = event.startedAt;
    if (event.startedAt && (!current.lastSeenAt || event.startedAt > current.lastSeenAt)) current.lastSeenAt = event.startedAt;
    visitors.set(email, current);
  });

  return [...visitors.values()].sort((a, b) => new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime());
}

function getLocalPlatformLabel(value: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("app") || normalized.includes("reactnative")) return "App";
  if (normalized.includes("mobile")) return "Mobile Web";
  return "Desktop Web";
}

function buildModuleDailyTrend(events: AnalyticsEvent[]) {
  const dayMap = new Map<string, Map<string, { moduleLabel: string; activeMs: number; totalMs: number; visits: number }>>();

  events.forEach((event) => {
    const date = event.date || getDateKey(new Date(event.startedAt).getTime());
    const dayModules = dayMap.get(date) || new Map();
    const current = dayModules.get(event.moduleLabel) || {
      moduleLabel: event.moduleLabel,
      activeMs: 0,
      totalMs: 0,
      visits: 0
    };
    current.activeMs += getEventActiveMs(event);
    current.totalMs += event.durationMs;
    current.visits += 1;
    dayModules.set(event.moduleLabel, current);
    dayMap.set(date, dayModules);
  });

  return [...dayMap.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-60)
    .map(([date, modules]) => ({
      date,
      modules: [...modules.values()].sort(
        (a, b) => moduleOrder.indexOf(a.moduleLabel) - moduleOrder.indexOf(b.moduleLabel)
      )
    }));
}

export function formatDuration(milliseconds: number) {
  if (!milliseconds) return "0s";
  const totalSeconds = Math.max(1, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function loadAnalyticsEvents(): AnalyticsEvent[] {
  try {
    const stored = globalThis.localStorage?.getItem(analyticsKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function loadUserCount() {
  try {
    const stored = globalThis.localStorage?.getItem(profilesKey);
    return stored ? JSON.parse(stored).length : 0;
  } catch {
    return 0;
  }
}

function loadProfiles(): Array<Record<string, any>> {
  try {
    const stored = globalThis.localStorage?.getItem(profilesKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function buildLocalVisitorEvents(events: AnalyticsEvent[], profiles: Array<Record<string, any>>): AnalyticsEvent[] {
  const profileEvents = profiles
    .filter((profile) => profile.email && !isExcludedReportEmail(String(profile.email)))
    .map((profile) => {
      const savedAt = String(profile.updatedAt || profile.updated_at || new Date().toISOString());
      return {
        activeDurationMs: 0,
        date: getDateKey(new Date(savedAt).getTime()),
        durationMs: 0,
        email: String(profile.email).toLowerCase(),
        moduleId: "profile-signup",
        moduleLabel: "Profile Signup",
        startedAt: savedAt
      };
    });

  return [...events, ...profileEvents];
}

function isVisitorOnlyEvent(event: AnalyticsEvent) {
  return event.moduleId === "site-visit" || event.moduleLabel === "Website Visit" || event.moduleId === "profile-signup";
}

function buildLocalUserInsights(events: AnalyticsEvent[]): UserInsightReport[] {
  return loadProfiles().filter((profile) => !isExcludedReportEmail(String(profile.email || ""))).map((profile) => {
    const email = String(profile.email || "").toLowerCase();
    const userEvents = events.filter((event) => event.email === email);
    const moduleStats = new Map<string, { moduleLabel: string; clicks: number; totalMs: number; activeMs: number }>();

    userEvents.forEach((event) => {
      const current = moduleStats.get(event.moduleLabel) || { moduleLabel: event.moduleLabel, clicks: 0, totalMs: 0, activeMs: 0 };
      current.clicks += 1;
      current.totalMs += event.durationMs;
      current.activeMs += getEventActiveMs(event);
      moduleStats.set(event.moduleLabel, current);
    });

    const sortedByClicks = [...moduleStats.values()].sort((a, b) => b.clicks - a.clicks || b.totalMs - a.totalMs);
    const sortedByTime = [...moduleStats.values()].sort((a, b) => b.totalMs - a.totalMs || b.clicks - a.clicks);
    const sortedByActiveTime = [...moduleStats.values()].sort((a, b) => b.activeMs - a.activeMs || b.clicks - a.clicks);

    return {
      name: profile.name || "",
      email,
      phone: profile.phone || "",
      language: profile.language || "",
      currentCity: profile.currentCity || "",
      currentState: profile.currentState || "",
      currentCountry: profile.currentCountry || "",
      birthChartType: profile.birthChart?.calculationType || "",
      sunSign: profile.birthChart?.sunSign || "",
      moonSign: profile.birthChart?.moonSign || "",
      risingSign: profile.birthChart?.risingSign || "",
      birthLocation: profile.birthLocationLabel || profile.birthChart?.locationLabel || "",
      totalClicks: userEvents.length,
      totalTimeMs: userEvents.reduce((sum, event) => sum + event.durationMs, 0),
      totalActiveTimeMs: userEvents.reduce((sum, event) => sum + getEventActiveMs(event), 0),
      mostClickedModule: sortedByClicks[0]?.moduleLabel || "No clicks yet",
      mostClickedCount: sortedByClicks[0]?.clicks || 0,
      mostTimeModule: sortedByTime[0]?.moduleLabel || "No time yet",
      mostTimeMs: sortedByTime[0]?.totalMs || 0,
      mostActiveModule: sortedByActiveTime[0]?.moduleLabel || "No active time yet",
      mostActiveMs: sortedByActiveTime[0]?.activeMs || 0,
      lastActiveAt: userEvents.length
        ? userEvents.map((event) => event.startedAt).sort()[userEvents.length - 1]
        : undefined
    };
  }).sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());
}

function isExcludedReportEmail(email: string) {
  return excludedReportEmails.has(String(email || "").trim().toLowerCase());
}

function buildVisitorVolume(events: AnalyticsEvent[], dateRange: { startDate: string; endDate: string }) {
  const today = getDateKey(Date.now());
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const monthStart = new Date(now);
  monthStart.setDate(now.getDate() - 29);

  return {
    today: countUniqueVisitors(events.filter((event) => event.date === today)),
    week: countUniqueVisitors(events.filter((event) => event.date >= getDateKey(weekStart.getTime()))),
    month: countUniqueVisitors(events.filter((event) => event.date >= getDateKey(monthStart.getTime()))),
    range: countUniqueVisitors(filterEventsByDateRange(events, dateRange))
  };
}

function buildVisitorTrend(events: AnalyticsEvent[]) {
  const dayMap = new Map<string, { date: string; visits: number; visitorEmails: Set<string> }>();
  events.forEach((event) => {
    const current = dayMap.get(event.date) || { date: event.date, visits: 0, visitorEmails: new Set<string>() };
    current.visits += 1;
    current.visitorEmails.add(event.email.trim().toLowerCase());
    dayMap.set(event.date, current);
  });

  return [...dayMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-60)
    .map((day) => ({
      date: day.date,
      uniqueVisitors: day.visitorEmails.size,
      visits: day.visits
    }));
}

function buildPlatformBreakdown(events: AnalyticsEvent[]) {
  const platformMap = new Map<string, { channel: string; label: string; visits: number; visitorEmails: Set<string> }>();

  events.forEach((event) => {
    const channel = normalizePlatformChannel(event.clientChannel || event.deviceCategory || "");
    const current = platformMap.get(channel) || {
      channel,
      label: getPlatformLabel(channel),
      visits: 0,
      visitorEmails: new Set<string>()
    };
    current.visits += 1;
    const email = event.email.trim().toLowerCase();
    if (email) current.visitorEmails.add(email);
    platformMap.set(channel, current);
  });

  return ["desktop-web", "mobile-web", "app"]
    .map((channel) => platformMap.get(channel) || { channel, label: getPlatformLabel(channel), visits: 0, visitorEmails: new Set<string>() })
    .map((entry) => ({
      channel: entry.channel,
      label: entry.label,
      visits: entry.visits,
      uniqueVisitors: entry.visitorEmails.size
    }));
}

function countUniqueVisitors(events: AnalyticsEvent[]) {
  return new Set(events.map((event) => event.email.trim().toLowerCase()).filter(Boolean)).size;
}

function filterEventsByDateRange(events: AnalyticsEvent[], dateRange: { startDate: string; endDate: string }) {
  return events.filter((event) =>
    (!dateRange.startDate || event.date >= dateRange.startDate) &&
    (!dateRange.endDate || event.date <= dateRange.endDate)
  );
}

function normalizeDateRange(startDate: string, endDate: string) {
  const normalizedStart = normalizeDateKey(startDate);
  const normalizedEnd = normalizeDateKey(endDate);
  return {
    startDate: normalizedStart,
    endDate: normalizedEnd && normalizedStart && normalizedEnd < normalizedStart ? normalizedStart : normalizedEnd
  };
}

function normalizeDateKey(value: string) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function calculateActiveDuration(startedAt: number, endedAt: number) {
  const durationMs = endedAt - startedAt;
  const browserDocument = typeof globalThis !== "undefined" ? (globalThis as any).document : undefined;
  if (!browserDocument) return durationMs;
  if (browserDocument.hidden) {
    return Math.max(1000, Math.min(durationMs, lastInteractionAt - startedAt));
  }
  return Math.max(1000, Math.min(durationMs, lastInteractionAt - startedAt + activeGraceMs));
}

function getEventActiveMs(event: AnalyticsEvent) {
  return Math.min(event.durationMs, event.activeDurationMs ?? event.durationMs);
}

function getClientPlatformDetails() {
  const browserWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
  const navigatorRef = typeof globalThis !== "undefined" ? (globalThis as any).navigator : undefined;
  const userAgent = String(navigatorRef?.userAgent || "");
  const isStandalone = Boolean(
    browserWindow?.matchMedia?.("(display-mode: standalone)")?.matches ||
    navigatorRef?.standalone
  );
  const appChannel = Boolean((globalThis as any).Expo || navigatorRef?.product === "ReactNative" || isStandalone);
  const mobileWeb = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const clientChannel = appChannel ? "app" : mobileWeb ? "mobile-web" : "desktop-web";

  return {
    clientChannel,
    deviceCategory: getPlatformLabel(clientChannel)
  };
}

function normalizePlatformChannel(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.includes("app") || normalized.includes("reactnative")) return "app";
  if (normalized.includes("mobile")) return "mobile-web";
  return "desktop-web";
}

function getPlatformLabel(channel: string) {
  if (channel === "app") return "App";
  if (channel === "mobile-web") return "Mobile Web";
  return "Desktop Web";
}

function loadFeedbackReport() {
  const improvementResponses: Array<{ moduleLabel: string; note: string; rating: number; email: string; savedAt?: string }> = [];
  let ratingTotal = 0;
  let ratingCount = 0;

  try {
    for (let index = 0; index < (globalThis.localStorage?.length || 0); index += 1) {
      const key = globalThis.localStorage?.key(index);
      if (!key?.startsWith("intuisity-module-feedback-")) continue;
      const email = key.replace("intuisity-module-feedback-", "");
      const feedback = JSON.parse(globalThis.localStorage?.getItem(key) || "{}");
      Object.entries(feedback).forEach(([moduleLabel, value]) => {
        const typedValue = value as { rating?: number; improvement?: string; updatedAt?: string };
        if (typedValue.rating) {
          ratingTotal += typedValue.rating;
          ratingCount += 1;
        }
        if (typedValue.improvement?.trim()) {
          improvementResponses.push({
            moduleLabel,
            note: typedValue.improvement.trim(),
            rating: typedValue.rating || 0,
            email,
            savedAt: typedValue.updatedAt
          });
        }
      });
    }
  } catch {
    return { feedbackCount: ratingCount, averageRating: 0, improvementResponses };
  }

  return {
    feedbackCount: ratingCount,
    averageRating: ratingCount ? Math.round((ratingTotal / ratingCount) * 10) / 10 : 0,
    improvementResponses: improvementResponses
      .sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime())
      .slice(0, 12)
  };
}

function getDateKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}
