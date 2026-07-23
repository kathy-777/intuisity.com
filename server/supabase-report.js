const { supabaseRequest } = require("./supabase");

const excludedReportEmails = new Set(["admin@intuisity.com", "kathy@intuisity.com"]);
const moduleOrder = [
  "Challenge 1: Treasure Chest",
  "Challenge 2: Train Your Knowing",
  "Challenge 3: Positivity Practice",
  "Challenge 4: Read the Person",
  "Challenge 5: Daily Astrology Tips",
  "Challenge 6: Remote Viewing Challenge",
  "Results Page"
];

async function buildAdminReport(options = {}) {
  const [allProfiles, allAnalyticsEvents, allDailyResults, allModuleFeedback, allFriends] = await Promise.all([
    selectAll("profiles"),
    selectAll("analytics_events"),
    selectAll("daily_results"),
    selectAll("module_feedback"),
    selectAll("friends")
  ]);
  const profiles = allProfiles.filter((profile) => !isExcludedReportEmail(profile.email));
  const analyticsEvents = allAnalyticsEvents.filter((event) => !isExcludedReportEmail(event.email));
  const dailyResults = allDailyResults.filter((entry) => !isExcludedReportEmail(entry.email));
  const moduleFeedback = allModuleFeedback.filter((entry) => !isExcludedReportEmail(entry.email));
  const friends = allFriends.filter((entry) => !isExcludedReportEmail(entry.email));

  const dateRange = normalizeDateRange(options.startDate, options.endDate);
  const rangedAnalyticsEvents = filterEventsByDateRange(analyticsEvents, dateRange);
  const volume = buildVisitorVolume(analyticsEvents, dateRange);
  const visitorTrend = buildVisitorTrend(rangedAnalyticsEvents);
  const moduleDailyTrend = buildModuleDailyTrend(rangedAnalyticsEvents);

  const moduleTotals = new Map();
  rangedAnalyticsEvents.forEach((event) => {
    const label = event.module_label || "Unknown area";
    const current = moduleTotals.get(label) || {
      moduleId: event.module_id || "",
      moduleLabel: label,
      visits: 0,
      totalMs: 0,
      activeMs: 0,
      averageMs: 0,
      averageActiveMs: 0
    };
    current.visits += 1;
    current.totalMs += Number(event.duration_ms || 0);
    current.activeMs += getActiveDuration(event);
    current.averageMs = Math.round(current.totalMs / current.visits);
    current.averageActiveMs = Math.round(current.activeMs / current.visits);
    moduleTotals.set(label, current);
  });

  const moduleSummaries = [...moduleTotals.values()].sort((a, b) => b.activeMs - a.activeMs || b.totalMs - a.totalMs);
  const totalTimeMs = rangedAnalyticsEvents.reduce((total, event) => total + Number(event.duration_ms || 0), 0);
  const totalActiveTimeMs = rangedAnalyticsEvents.reduce((total, event) => total + getActiveDuration(event), 0);
  const ratings = moduleFeedback.filter((entry) => Number(entry.rating || 0));
  const ratingTotal = ratings.reduce((total, entry) => total + Number(entry.rating || 0), 0);
  const userInsights = buildUserInsights({ analyticsEvents: rangedAnalyticsEvents, dailyResults, friends, moduleFeedback, profiles });

  return {
    totalUsers: profiles.length,
    totalVisits: rangedAnalyticsEvents.length,
    uniqueVisitors: countUniqueVisitors(rangedAnalyticsEvents),
    visitorVolume: volume,
    visitorTrend,
    moduleDailyTrend,
    dateRange,
    totalTimeMs,
    totalActiveTimeMs,
    averageSessionMs: rangedAnalyticsEvents.length ? Math.round(totalTimeMs / rangedAnalyticsEvents.length) : 0,
    averageActiveSessionMs: rangedAnalyticsEvents.length ? Math.round(totalActiveTimeMs / rangedAnalyticsEvents.length) : 0,
    mostUsedModule: moduleSummaries[0]?.moduleLabel || "No module activity yet",
    moduleSummaries,
    feedbackCount: ratings.length,
    averageRating: ratings.length ? Math.round((ratingTotal / ratings.length) * 10) / 10 : 0,
    improvementResponses: moduleFeedback
      .filter((entry) => entry.improvement)
      .sort((a, b) => new Date(b.saved_at || 0).getTime() - new Date(a.saved_at || 0).getTime())
      .slice(0, 50)
      .map((entry) => ({
        moduleLabel: entry.module_label,
        note: entry.improvement,
        rating: entry.rating,
        email: entry.email,
        savedAt: entry.saved_at
      })),
    userInsights
  };
}

function buildModuleDailyTrend(events) {
  const dayMap = new Map();
  events.forEach((event) => {
    const date = getEventDateKey(event);
    const label = event.module_label || "Unknown area";
    const dayModules = dayMap.get(date) || new Map();
    const current = dayModules.get(label) || { moduleLabel: label, activeMs: 0, totalMs: 0, visits: 0 };
    current.activeMs += getActiveDuration(event);
    current.totalMs += Number(event.duration_ms || 0);
    current.visits += 1;
    dayModules.set(label, current);
    dayMap.set(date, dayModules);
  });

  return [...dayMap.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-60)
    .map(([date, modules]) => ({
      date,
      modules: [...modules.values()].sort((a, b) => moduleOrder.indexOf(a.moduleLabel) - moduleOrder.indexOf(b.moduleLabel))
    }));
}

async function buildUserInsightsCsv(options = {}) {
  const report = await buildAdminReport(options);
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Language",
    "Current City",
    "Current State",
    "Current Country",
    "Most Clicked Module",
    "Most Clicked Count",
    "Most Time Module",
    "Most Time",
    "Most Active Module",
    "Most Active Time",
    "Total Clicks",
    "Total Time",
    "Total Active Time",
    "Days With Results",
    "Average Score Percent",
    "Average Rating",
    "Comment Count",
    "Saved Friend Count",
    "Last Active"
  ];

  const lines = [
    headers,
    ...report.userInsights.map((row) => [
      row.name,
      row.email,
      row.phone,
      row.language,
      row.currentCity,
      row.currentState,
      row.currentCountry,
      row.mostClickedModule,
      row.mostClickedCount,
      row.mostTimeModule,
      formatDuration(row.mostTimeMs),
      row.mostActiveModule,
      formatDuration(row.mostActiveMs),
      row.totalClicks,
      formatDuration(row.totalTimeMs),
      formatDuration(row.totalActiveTimeMs),
      row.daysWithResults,
      row.averageScorePercent,
      row.averageRating,
      row.commentCount,
      row.savedFriendCount,
      row.lastActiveAt || ""
    ])
  ];

  return lines.map((line) => line.map(escapeCsvValue).join(",")).join("\n");
}

function buildUserInsights({ analyticsEvents, dailyResults, friends, moduleFeedback, profiles }) {
  return profiles.map((profile) => {
    const email = profile.email;
    const events = analyticsEvents.filter((event) => event.email === email);
    const results = dailyResults.filter((entry) => entry.email === email);
    const feedback = moduleFeedback.filter((entry) => entry.email === email);
    const savedFriends = friends.find((entry) => entry.email === email);
    const moduleStats = new Map();

    events.forEach((event) => {
      const label = event.module_label || "Unknown area";
      const current = moduleStats.get(label) || { moduleLabel: label, clicks: 0, totalMs: 0, activeMs: 0 };
      current.clicks += 1;
      current.totalMs += Number(event.duration_ms || 0);
      current.activeMs += getActiveDuration(event);
      moduleStats.set(label, current);
    });

    const sortedByClicks = [...moduleStats.values()].sort((a, b) => b.clicks - a.clicks || b.totalMs - a.totalMs);
    const sortedByTime = [...moduleStats.values()].sort((a, b) => b.totalMs - a.totalMs || b.clicks - a.clicks);
    const sortedByActiveTime = [...moduleStats.values()].sort((a, b) => b.activeMs - a.activeMs || b.clicks - a.clicks);
    const ratings = feedback.filter((entry) => Number(entry.rating || 0) > 0);
    const totalScore = results.reduce((sum, entry) => sum + Number(entry.total || 0), 0);
    const totalPossible = results.reduce((sum, entry) => sum + Number(entry.maximum || 0), 0);

    return {
      name: profile.name || "",
      email,
      phone: profile.phone || "",
      language: profile.language || "",
      currentCity: profile.current_city || "",
      currentState: profile.current_state || "",
      currentCountry: profile.current_country || "",
      totalClicks: events.length,
      totalTimeMs: events.reduce((sum, event) => sum + Number(event.duration_ms || 0), 0),
      totalActiveTimeMs: events.reduce((sum, event) => sum + getActiveDuration(event), 0),
      mostClickedModule: sortedByClicks[0]?.moduleLabel || "No clicks yet",
      mostClickedCount: sortedByClicks[0]?.clicks || 0,
      mostTimeModule: sortedByTime[0]?.moduleLabel || "No time yet",
      mostTimeMs: sortedByTime[0]?.totalMs || 0,
      mostActiveModule: sortedByActiveTime[0]?.moduleLabel || "No active time yet",
      mostActiveMs: sortedByActiveTime[0]?.activeMs || 0,
      daysWithResults: results.length,
      averageScorePercent: totalPossible ? Math.round((totalScore / totalPossible) * 100) : 0,
      averageRating: ratings.length
        ? Math.round((ratings.reduce((sum, entry) => sum + Number(entry.rating || 0), 0) / ratings.length) * 10) / 10
        : 0,
      commentCount: feedback.filter((entry) => String(entry.improvement || "").trim()).length,
      savedFriendCount: Array.isArray(savedFriends?.friends) ? savedFriends.friends.length : 0,
      lastActiveAt: events.length
        ? events.map((event) => event.recorded_at || event.started_at).sort().at(-1)
        : profile.updated_at
    };
  }).sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());
}

function selectAll(table) {
  return supabaseRequest(`/${table}?select=*`);
}

function buildVisitorVolume(events, dateRange) {
  const today = getLocalDateKey(new Date());
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const monthStart = new Date(now);
  monthStart.setDate(now.getDate() - 29);

  return {
    today: countUniqueVisitors(filterEventsSince(events, today)),
    week: countUniqueVisitors(filterEventsFromDate(events, weekStart)),
    month: countUniqueVisitors(filterEventsFromDate(events, monthStart)),
    range: countUniqueVisitors(filterEventsByDateRange(events, dateRange))
  };
}

function buildVisitorTrend(events) {
  const dayMap = new Map();
  events.forEach((event) => {
    const date = getEventDateKey(event);
    const current = dayMap.get(date) || { date, visitCount: 0, visitorEmails: new Set() };
    current.visitCount += 1;
    const email = String(event.email || "").trim().toLowerCase();
    if (email) current.visitorEmails.add(email);
    dayMap.set(date, current);
  });

  return [...dayMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-60)
    .map((day) => ({
      date: day.date,
      uniqueVisitors: day.visitorEmails.size,
      visits: day.visitCount
    }));
}

function countUniqueVisitors(events) {
  return new Set(events.map((event) => String(event.email || "").trim().toLowerCase()).filter(Boolean)).size;
}

function filterEventsSince(events, dateKey) {
  return events.filter((event) => getEventDateKey(event) === dateKey);
}

function filterEventsFromDate(events, startDate) {
  const startKey = getLocalDateKey(startDate);
  return events.filter((event) => getEventDateKey(event) >= startKey);
}

function filterEventsByDateRange(events, dateRange) {
  return events.filter((event) => {
    const dateKey = getEventDateKey(event);
    return (!dateRange.startDate || dateKey >= dateRange.startDate) && (!dateRange.endDate || dateKey <= dateRange.endDate);
  });
}

function normalizeDateRange(startDate, endDate) {
  const normalizedStart = normalizeDateKey(startDate);
  const normalizedEnd = normalizeDateKey(endDate);
  return {
    startDate: normalizedStart,
    endDate: normalizedEnd && normalizedStart && normalizedEnd < normalizedStart ? normalizedStart : normalizedEnd
  };
}

function normalizeDateKey(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function getEventDateKey(event) {
  if (event.date) return String(event.date).slice(0, 10);
  return getLocalDateKey(new Date(event.recorded_at || event.started_at || Date.now()));
}

function getLocalDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function getActiveDuration(event) {
  return Number(event.active_duration_ms || event.duration_ms || 0);
}

function isExcludedReportEmail(email) {
  return excludedReportEmails.has(String(email || "").trim().toLowerCase());
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatDuration(milliseconds) {
  if (!milliseconds) return "0s";
  const totalSeconds = Math.max(1, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

module.exports = {
  buildAdminReport,
  buildUserInsightsCsv
};
