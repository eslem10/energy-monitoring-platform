const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "..", "data");
const alertsPath = path.join(dataDir, "alerts.json");
const mergeWindowMs = 15 * 60 * 1000;
const autoResolveMs = 2 * 60 * 1000;

function ensureAlertsFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(alertsPath)) {
    fs.writeFileSync(alertsPath, JSON.stringify([], null, 2));
  }
}

function readAlerts() {
  ensureAlertsFile();

  try {
    const alerts = JSON.parse(fs.readFileSync(alertsPath, "utf8"));
    return Array.isArray(alerts) ? alerts : [];
  } catch (err) {
    return [];
  }
}

function writeAlerts(alerts) {
  ensureAlertsFile();
  fs.writeFileSync(alertsPath, JSON.stringify(alerts.slice(0, 500), null, 2));
}

function fingerprint(alert) {
  return crypto
    .createHash("sha1")
    .update([alert.device, alert.title, alert.level, alert.reason].join("|"))
    .digest("hex");
}

function normalizeAlert(alert) {
  const now = new Date().toISOString();
  const key = fingerprint(alert);

  return {
    id: crypto.randomUUID(),
    key,
    title: alert.title || "Alert",
    device: alert.device || "unknown",
    reason: alert.reason || "",
    power: Number(alert.power || 0),
    time: alert.time || now,
    level: alert.level || "info",
    firstSeenAt: alert.time || now,
    lastSeenAt: alert.time || now,
    count: 1,
    acknowledged: false,
    resolved: false,
  };
}

function recordActiveAlerts(activeAlerts) {
  const now = Date.now();
  const alerts = readAlerts();
  const activeKeys = new Set(activeAlerts.map(fingerprint));

  for (const alert of alerts) {
    if (!activeKeys.has(alert.key) && !alert.resolved) {
      const lastSeen = Date.parse(alert.lastSeenAt || alert.time || 0);
      if (Number.isFinite(lastSeen) && now - lastSeen > autoResolveMs) {
        alert.resolved = true;
        alert.resolvedAt = new Date().toISOString();
      }
    }
  }

  const enrichedActive = activeAlerts.map((alert) => {
    const key = fingerprint(alert);
    const existing = alerts.find((item) => {
      if (item.key !== key || item.resolved) return false;
      const lastSeen = Date.parse(item.lastSeenAt || item.time || 0);
      return Number.isFinite(lastSeen) && now - lastSeen <= mergeWindowMs;
    });

    if (existing) {
      existing.power = Number(alert.power || existing.power || 0);
      existing.time = alert.time || existing.time;
      existing.lastSeenAt = alert.time || new Date().toISOString();
      existing.count = Number(existing.count || 1) + 1;
      return existing;
    }

    const next = normalizeAlert(alert);
    alerts.unshift(next);
    return next;
  });

  alerts.sort((a, b) => Date.parse(b.lastSeenAt || b.time || 0) - Date.parse(a.lastSeenAt || a.time || 0));
  writeAlerts(alerts);
  return enrichedActive;
}

function listHistory({ limit = 100, unreadOnly = false } = {}) {
  const numericLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  return readAlerts()
    .filter((alert) => !unreadOnly || !alert.acknowledged)
    .sort((a, b) => Date.parse(b.lastSeenAt || b.time || 0) - Date.parse(a.lastSeenAt || a.time || 0))
    .slice(0, numericLimit);
}

function acknowledgeAlert(id) {
  const alerts = readAlerts();
  const alert = alerts.find((item) => item.id === id);
  if (!alert) return null;

  alert.acknowledged = true;
  alert.acknowledgedAt = new Date().toISOString();
  writeAlerts(alerts);
  return alert;
}

function clearHistory() {
  writeAlerts([]);
}

module.exports = {
  acknowledgeAlert,
  clearHistory,
  listHistory,
  recordActiveAlerts,
};
