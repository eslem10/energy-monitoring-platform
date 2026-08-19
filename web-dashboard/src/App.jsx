import React from "react";
import {
  API_URL,
  REFRESH_MS,
  deviceColor,
  deviceIcon,
  formatPower,
  formatWh,
  prettyDevice,
  timeOnly,
} from "./config.js";
import "./App.css";
import { AssistantChat } from "./components/AssistantChat.jsx";
import { BudgetCard } from "./components/BudgetCard.jsx";
import { DeviceCard } from "./components/DeviceCard.jsx";
import { DeviceDetailModal } from "./components/DeviceDetailModal.jsx";
import { GaugeCard } from "./components/GaugeCard.jsx";
import { OverconsumptionBanner } from "./components/OverconsumptionBanner.jsx";
import { SidebarDrawer } from "./components/SidebarDrawer.jsx";
import { LineChart } from "./components/charts/LineChart.jsx";
import { WeeklyBarChart } from "./components/charts/WeeklyBarChart.jsx";

const MAX_POWER_THRESHOLD = 1800;
const MONTHLY_BUDGET_TND = 30;
const TARIFF_TND_PER_KWH = 0.25;

async function fetchJson(path) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportReportPdf(dailyStats, energy) {
  const stats = dailyStats || {};
  const rows = energy.map((item) => `<tr><td>${prettyDevice(item.device)}</td><td>${formatWh(item.energyWh)}</td></tr>`).join("");
  const reportWindow = window.open("", "_blank", "width=800,height=700");
  if (!reportWindow) return;
  reportWindow.document.write(`<!doctype html><html><head><title>Energy report</title><style>body{font:16px Arial;padding:32px;color:#172033}h1{color:#087b54}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:28px;font-weight:bold}</style></head><body><h1>Smart House Energy Report</h1><p>Generated ${new Date().toLocaleString()}</p><p class="total">Energy today: ${formatWh(stats.todayWh || 0)}</p><p>Average power: ${formatPower(stats.averagePower || 0)} &middot; Peak: ${formatPower(stats.peakPower || 0)}</p><h2>Energy by device (last hour)</h2><table><thead><tr><th>Device</th><th>Energy</th></tr></thead><tbody>${rows || "<tr><td colspan='2'>No data</td></tr>"}</tbody></table></body></html>`);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
}

function currentTotal(summary) {
  if (summary?.total !== null && summary?.total !== undefined && Number.isFinite(Number(summary.total))) {
    return Number(summary.total);
  }
  return Number(summary?.sumDevices || 0);
}

function DashboardPage({ summary, history, energy, alerts, deviceHealth, billing, theme, settings, onOpenDevice, onTurnOffDevice, loading }) {
  const tariff = Number(settings?.tariffTndPerKwh ?? TARIFF_TND_PER_KWH);
  const budget = Number(settings?.monthlyBudgetTnd ?? MONTHLY_BUDGET_TND);
  const devices = (summary?.devices || []).filter((item) => item.device !== "total");
  const total = currentTotal(summary);
  const activeDevices = devices.filter((item) => Number(item.power) > 5);
  const peak = history.length ? Math.max(...history.map((point) => Number(point.power || 0))) : 0;
  const energyTotal = energy.reduce((sum, row) => sum + Number(row.energyWh || 0), 0);
  const monthlyCost = (energyTotal / 1000) * tariff * 24 * 30;
  const weeklyData = energy.map((row) => ({
    label: prettyDevice(row.device).slice(0, 6),
    value: Number(row.energyWh || 0),
    isToday: true,
  }));

  // 1. Top Consumer Highlight
  const sortedByEnergy = [...energy].sort((a, b) => Number(b.energyWh || 0) - Number(a.energyWh || 0));
  const topConsumer = sortedByEnergy[0] || null;
  const topConsumerPercentage = energyTotal > 0 && topConsumer ? ((Number(topConsumer.energyWh) / energyTotal) * 100).toFixed(0) : 0;

  // 2. Active Runtime Tracking in the last 60 minutes
  const runtimes = devices.map((d) => {
    const devicePoints = history.filter((p) => p.device === d.device);
    if (!devicePoints.length) return { device: d.device, minutes: 0 };
    const activePoints = devicePoints.filter((p) => Number(p.power) > (d.device === "frigo" ? 20 : 5));
    const minutes = Math.round((activePoints.length / devicePoints.length) * 60);
    return { device: d.device, minutes };
  });

  // 4. Standby/Phantom Power Cost Estimation
  const standbyPower = devices.reduce((sum, d) => {
    const p = Number(d.power || 0);
    const isStandby = p > 0.1 && p <= (d.device === "frigo" ? 20 : 10);
    return sum + (isStandby ? p : 0);
  }, 0);
  const standbyCostMonthly = (standbyPower / 1000) * tariff * 24 * 30;

  // 6. Yesterday vs Today comparison
  const todayEnergyWh = Number(summary?.todayEnergyWh || 0);
  const yesterdayEnergyWh = Number(summary?.yesterdayEnergyWh || 0);
  const comparisonPercent = yesterdayEnergyWh > 0 ? ((todayEnergyWh - yesterdayEnergyWh) / yesterdayEnergyWh) * 100 : 0;

  return (
    <>
      <OverconsumptionBanner
        currentTotal={total}
        maxThreshold={MAX_POWER_THRESHOLD}
        activeDevices={activeDevices}
        onTurnOffDevice={onTurnOffDevice}
      />

      <section className="hero-grid">
        <div className="panel panel-pad metric-hero">
          <p className="metric-label">Total current power</p>
          <div className="metric-value">{loading ? "..." : formatPower(total)}</div>
          <p className="metric-sub">{activeDevices.length} active devices in real time</p>
        </div>

        <div className="mini-stats">
          <div className="panel mini-card">
            <div className="icon">ON</div>
            <h3>Active devices</h3>
            <strong>{activeDevices.length}</strong>
          </div>
          <div className="panel mini-card">
            <div className="icon">W</div>
            <h3>Peak seen</h3>
            <strong>{formatPower(peak)}</strong>
          </div>
          <div className="panel mini-card">
            <div className="icon">Wh</div>
            <h3>Energy last hour</h3>
            <strong>{formatWh(energyTotal)}</strong>
          </div>
          <div className="panel mini-card">
            <div className="icon">TND</div>
            <h3>Monthly projection</h3>
            <strong>{monthlyCost.toFixed(2)}</strong>
          </div>
        </div>

        <BudgetCard monthlyCost={monthlyCost} monthlyBudget={budget} />
      </section>

      {/* Insights & Consumption Statistics */}
      <section className="section">
        <div className="section-head">
          <h2>Insights de Consommation</h2>
          <span className="muted">Analyse en temps réel</span>
        </div>
        <div className="insight-grid">
          {/* Card 1: Top Consumer */}
          <div className="panel panel-pad insight-card">
            <span className="icon-label">🏆</span>
            <h3>Appareil le plus énergivore</h3>
            {topConsumer ? (
              <>
                <div className="value">{prettyDevice(topConsumer.device)}</div>
                <p className="subtext">
                  A consommé <strong>{formatWh(topConsumer.energyWh)}</strong> ({topConsumerPercentage}% de la consommation totale de la dernière heure).
                </p>
              </>
            ) : (
              <div className="value">Aucune donnée</div>
            )}
          </div>

          {/* Card 2: Active Runtime */}
          <div className="panel panel-pad insight-card">
            <span className="icon-label">🕒</span>
            <h3>Temps d'activité (dernière heure)</h3>
            <div className="runtime-list">
              {runtimes.slice(0, 4).map((r) => (
                <div key={r.device} className="runtime-row">
                  <span style={{ width: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {prettyDevice(r.device)}
                  </span>
                  <div className="runtime-bar-bg">
                    <div className="runtime-bar-fill" style={{ width: `${(r.minutes / 60) * 100}%`, background: deviceColor(r.device) }} />
                  </div>
                  <strong>{r.minutes} min</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Standby power cost */}
          <div className="panel panel-pad insight-card">
            <span className="icon-label">🔌</span>
            <h3>Consommation en veille (estimation)</h3>
            <div className="value">{standbyPower.toFixed(1)} W</div>
            <p className="subtext">
              Soit environ <strong>{standbyCostMonthly.toFixed(3)} TND</strong> par mois gaspillés si laissés branchés.
            </p>
          </div>

          {/* Card 6: Yesterday vs Today comparison */}
          <div className="panel panel-pad insight-card">
            <span className="icon-label">📅</span>
            <h3>Aujourd'hui vs Hier (24h)</h3>
            <div className="value">{formatWh(todayEnergyWh)}</div>
            <p className="subtext">
              Consommation totale des dernières 24h.
              {yesterdayEnergyWh > 0 ? (
                <>
                  {" "}
                  {comparisonPercent > 0 ? (
                    <span style={{ color: "var(--red)", fontWeight: "bold" }}>+{comparisonPercent.toFixed(1)}%</span>
                  ) : (
                    <span style={{ color: "var(--green)", fontWeight: "bold" }}>{comparisonPercent.toFixed(1)}%</span>
                  )}{" "}
                  par rapport à hier ({formatWh(yesterdayEnergyWh)}).
                </>
              ) : (
                " (Pas de données pour hier)"
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Dashboard Principal</h2>
          <span className="status-pill"><span className="dot" /> Live</span>
        </div>
        <div className="device-grid">
          {devices.map((reading) => (
            <DeviceCard key={reading.device} reading={reading} onClick={onOpenDevice} />
          ))}
        </div>
      </section>

      <section className="section chart-grid">
        <div className="panel panel-pad">
          <div className="section-head">
            <h2>Power Consumption Over Time</h2>
            <span className="muted">Last hour</span>
          </div>
          <div className="canvas-wrap">
            <LineChart points={history.filter((point) => point.device !== "total")} theme={theme} />
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="section-head">
            <h2>Energy by Device</h2>
            <span className="muted">Wh</span>
          </div>
          <div className="canvas-wrap">
            <WeeklyBarChart data={weeklyData.length ? weeklyData : [{ label: "No data", value: 0, isToday: true }]} theme={theme} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Power Gauge by Device</h2>
          <span className="muted">Click a gauge for details</span>
        </div>
        <div className="gauge-grid">
          {devices.map((reading) => (
            <GaugeCard key={reading.device} reading={reading} maxPower={1200} onClick={onOpenDevice} />
          ))}
        </div>
      </section>

      <section className="section lower-grid">
        <LatestMeasurements devices={devices} />
        <AlertsPanel alerts={alerts} />
      </section>

      <section className="section lower-grid">
        <div className="panel panel-pad">
          <div className="section-head"><h2>Estimated Bill</h2><span className="muted">Not an official STEG invoice</span></div>
          <div className="metric-value" style={{ fontSize: 32 }}>{Number(billing?.totalTnd || 0).toFixed(2)} TND</div>
          <p className="muted">Projected from the last 24h: {Number(billing?.projectedKwhMonth || 0).toFixed(2)} kWh/month</p>
          <p className="muted">Energy {Number(billing?.energyCostTnd || 0).toFixed(2)} TND + VAT {Number(billing?.vatTnd || 0).toFixed(2)} TND</p>
        </div>
        <div className="panel panel-pad">
          <div className="section-head"><h2>Device Connectivity</h2><span className="muted">Offline after 30 seconds</span></div>
          {(deviceHealth || []).map((device) => (
            <div className="alert" key={device.device}>
              <div className="alert-icon">{device.state === "online" ? "OK" : "!"}</div>
              <div><strong>{prettyDevice(device.device)}</strong><div className="muted">{device.state === "online" ? "Online" : `Offline${device.ageSeconds !== null ? ` (${device.ageSeconds}s)` : ""}`}</div></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function LatestMeasurements({ devices }) {
  return (
    <div className="panel panel-pad">
      <div className="section-head">
        <h2>Latest Measurements</h2>
        <span className="muted">{devices.length} devices</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Device</th>
            <th>Power</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.device}>
              <td>
                <span className="inline-icon" style={{ background: deviceColor(device.device) }}>{deviceIcon(device.device)}</span>{" "}
                {prettyDevice(device.device)}
              </td>
              <td>{formatPower(device.power)}</td>
              <td><span className={`badge ${Number(device.power) <= 5 ? "off" : ""}`}>{device.status}</span></td>
              <td>{timeOnly(device.time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertsPanel({ alerts }) {
  return (
    <div className="panel panel-pad">
      <div className="section-head">
        <h2>Recent Alerts</h2>
        <span className="muted">{alerts.length}</span>
      </div>
      {alerts.length === 0 ? (
        <p className="muted">No active alerts for the selected period.</p>
      ) : (
        alerts.slice(0, 6).map((alert, index) => (
          <div className="alert" key={`${alert.device}-${alert.title}-${index}`}>
            <div className="alert-icon">!</div>
            <div>
              <strong>{alert.title}</strong>
              <div className="muted">{prettyDevice(alert.device)} - {alert.reason}</div>
            </div>
            <span className="muted">{timeOnly(alert.time)}</span>
          </div>
        ))
      )}
    </div>
  );
}

function NotificationsPage({ alerts, onMarkRead }) {
  const unreadCount = alerts.filter((alert) => !alert.acknowledged).length;

  return (
    <>
      <div className="section-head">
        <h2>Alert History & Notifications</h2>
        <span className="status-pill"><span className="dot" /> {unreadCount} unread</span>
      </div>

      <section className="section panel panel-pad">
        {alerts.length === 0 ? (
          <p className="muted">No notifications recorded yet. Alerts will stay here after a device returns to normal.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>State</th>
                <th>Device</th>
                <th>Reason</th>
                <th>Power</th>
                <th>Last seen</th>
                <th>Count</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert, index) => (
                <tr key={alert.id || `${alert.device}-${alert.title}-${index}`}>
                  <td>
                    <span className={`badge ${alert.resolved ? "off" : ""}`}>
                      {alert.resolved ? "Resolved" : alert.level || "Active"}
                    </span>
                  </td>
                  <td>{prettyDevice(alert.device)}</td>
                  <td>
                    <strong>{alert.title}</strong>
                    <div className="muted">{alert.reason}</div>
                  </td>
                  <td>{formatPower(alert.power)}</td>
                  <td>{timeOnly(alert.lastSeenAt || alert.time)}</td>
                  <td>{alert.count || 1}</td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => onMarkRead(alert.id)}
                      disabled={!alert.id || alert.acknowledged}
                    >
                      {alert.acknowledged ? "Read" : "Mark read"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function DailyStatsPanel({ dailyStats }) {
  const stats = dailyStats || {};
  const change = stats.changePercent;
  const byDevice = Array.isArray(stats.byDevice) ? stats.byDevice : [];
  const last7Days = Array.isArray(stats.last7Days) ? stats.last7Days : [];

  return (
    <section className="section panel panel-pad">
      <div className="section-head">
        <h2>Daily Stats</h2>
        <span className="muted">Last 24h vs previous 24h</span>
      </div>

      <div className="mini-stats">
        <div className="panel mini-card">
          <div className="icon">24h</div>
          <h3>Energy today</h3>
          <strong>{formatWh(stats.todayWh || 0)}</strong>
        </div>
        <div className="panel mini-card">
          <div className="icon">AVG</div>
          <h3>Average power</h3>
          <strong>{formatPower(stats.averagePower || 0)}</strong>
        </div>
        <div className="panel mini-card">
          <div className="icon">MAX</div>
          <h3>Peak</h3>
          <strong>{formatPower(stats.peakPower || 0)}</strong>
        </div>
        <div className="panel mini-card">
          <div className="icon">%</div>
          <h3>Vs yesterday</h3>
          <strong>{change === null || change === undefined ? "--" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}</strong>
        </div>
      </div>

      <div className="chart-grid" style={{ marginTop: 16 }}>
        <div>
          <h3>Top devices today</h3>
          <table>
            <tbody>
              {byDevice.slice(0, 6).map((item) => (
                <tr key={item.device}>
                  <td>{prettyDevice(item.device)}</td>
                  <td>{formatWh(item.energyWh)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Last 7 days</h3>
          <table>
            <tbody>
              {last7Days.map((item) => (
                <tr key={item.date}>
                  <td>{item.date}</td>
                  <td>{formatWh(item.energyWh)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ReportsPage({ history, energy, devices, dailyStats }) {
  const rows = history.slice(-80).reverse().map((point) => ({
    time: point.time,
    device: point.device,
    power: Number(point.power || 0).toFixed(2),
  }));

  return (
    <>
      <section className="section-head">
        <h2>Reports & CSV Exports</h2>
        <span className="muted">Export measurements and energy summaries</span>
      </section>

      <DailyStatsPanel dailyStats={dailyStats} />

      <div className="export-grid">
        <div className="export-card">
          <div className="export-card-header">
            <div className="export-card-icon">CSV</div>
            <div>
              <h3>Measurements history</h3>
              <p className="muted">Latest power points for every device.</p>
            </div>
          </div>
          <button className="btn-csv" onClick={() => downloadCsv("measurements.csv", rows)} disabled={!rows.length}>
            Download measurements CSV
          </button>
        </div>

        <div className="export-card">
          <div className="export-card-header">
            <div className="export-card-icon">Wh</div>
            <div>
              <h3>Energy by device</h3>
              <p className="muted">Estimated consumption over the last hour.</p>
            </div>
          </div>
          <button className="btn-csv" onClick={() => downloadCsv("energy-by-device.csv", energy)} disabled={!energy.length}>
            Download energy CSV
          </button>
        </div>

        <div className="export-card">
          <div className="export-card-header">
            <div className="export-card-icon">PDF</div>
            <div>
              <h3>Printable energy report</h3>
              <p className="muted">Open a summary and choose “Save as PDF”.</p>
            </div>
          </div>
          <button className="btn-csv" onClick={() => exportReportPdf(dailyStats, energy)}>
            Export report as PDF
          </button>
        </div>
      </div>

      <section className="panel panel-pad">
        <div className="section-head">
          <h2>Latest table</h2>
          <span className="muted">{devices.length} live devices</span>
        </div>
        <LatestMeasurements devices={devices} />
      </section>
    </>
  );
}

function EnergyCalendar({ entries }) {
  const max = Math.max(1, ...entries.map((entry) => Number(entry.energyWh || 0)));
  return <section className="section panel panel-pad"><div className="section-head"><h2>Energy Calendar</h2><span className="muted">Last 35 days</span></div><div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>{entries.map((entry) => <div key={entry.date} title={`${entry.date}: ${formatWh(entry.energyWh)}`} style={{ minHeight: 60, padding: 8, borderRadius: 10, background: `rgba(22,191,118,${0.12 + 0.88 * Number(entry.energyWh || 0) / max})`, color: Number(entry.energyWh || 0) / max > .55 ? "white" : "var(--ink)" }}><strong>{entry.date.slice(8)}</strong><br /><small>{formatWh(entry.energyWh)}</small></div>)}</div></section>;
}

function ProfilePage({ user, onSave }) {
  const [name, setName] = React.useState(user?.name || ""); const [password, setPassword] = React.useState(""); const [message, setMessage] = React.useState("");
  async function saveProfile(event) { event.preventDefault(); const saved = await fetchJsonPost("/api/auth/profile", { email: user.email, name }); localStorage.setItem("smart-house-user", JSON.stringify(saved)); onSave(saved); setMessage("Profile saved."); }
  async function reset(event) { event.preventDefault(); await fetchJsonPost("/api/auth/reset-password", { email: user.email, password }); setPassword(""); setMessage("Password updated."); }
  return <><div className="section-head"><h2>Profile</h2><span className="muted">Manage your account</span></div><section className="section panel panel-pad"><form className="form-grid" onSubmit={saveProfile}><div className="form-group"><label>Name</label><input className="text-input" value={name} onChange={(e) => setName(e.target.value)} /></div><div className="form-group"><label>Email</label><input className="text-input" value={user.email} disabled /></div><button className="btn-submit">Save profile</button></form></section><section className="section panel panel-pad"><h2>Reset password</h2><p className="muted">Local reset for this demo. Add email verification before production.</p><form className="form-grid" onSubmit={reset}><div className="form-group"><label>New password</label><input className="text-input" type="password" minLength="4" value={password} onChange={(e) => setPassword(e.target.value)} required /></div><button className="btn-submit">Update password</button></form>{message ? <p className="success-box">{message}</p> : null}</section></>;
}

function SettingsPage({ devices, registry, settings, onSaveSettings, onRefresh }) {
  const [form, setForm] = React.useState({ name: "", label: "", topic: "" });
  const [settingsForm, setSettingsForm] = React.useState({
    monthlyBudgetTnd: settings?.monthlyBudgetTnd ?? MONTHLY_BUDGET_TND,
    tariffTndPerKwh: settings?.tariffTndPerKwh ?? TARIFF_TND_PER_KWH,
  });
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    setSettingsForm({
      monthlyBudgetTnd: settings?.monthlyBudgetTnd ?? MONTHLY_BUDGET_TND,
      tariffTndPerKwh: settings?.tariffTndPerKwh ?? TARIFF_TND_PER_KWH,
    });
  }, [settings]);

  async function saveDevice(event) {
    event.preventDefault();
    setMessage("");
    try {
      const name = form.name.trim();
      await fetchJsonPost("/api/admin/devices", {
        name,
        label: form.label.trim() || prettyDevice(name),
        topic: form.topic.trim() || `maison/${name}`,
        enabled: true,
      });
      setForm({ name: "", label: "", topic: "" });
      setMessage("Device added. When MQTT sends data with this device name, it appears automatically.");
      onRefresh();
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  }

  async function removeDevice(name) {
    await fetch(`${API_URL}/api/admin/devices/${encodeURIComponent(name)}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <>
      <div className="section-head">
        <h2>Settings & Budget</h2>
        <span className="muted">Automatic devices + budget setup</span>
      </div>

      <BudgetCard
        monthlyCost={(devices.reduce((sum, row) => sum + Number(row.power || 0), 0) / 1000) * Number(settingsForm.tariffTndPerKwh || TARIFF_TND_PER_KWH) * 24 * 30}
        monthlyBudget={Number(settingsForm.monthlyBudgetTnd || MONTHLY_BUDGET_TND)}
      />

      <section className="section panel panel-pad">
        <div className="section-head">
          <h2>Budget and tariff</h2>
          <span className="muted">Saved in backend</span>
        </div>
        <form className="form-grid" onSubmit={(event) => {
          event.preventDefault();
          onSaveSettings(settingsForm).then(() => setMessage("Settings saved in backend."));
        }}>
          <div className="form-group">
            <label>Monthly budget (TND)</label>
            <input className="text-input" type="number" step="0.1" value={settingsForm.monthlyBudgetTnd} onChange={(e) => setSettingsForm({ ...settingsForm, monthlyBudgetTnd: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Tariff (TND/kWh)</label>
            <input className="text-input" type="number" step="0.001" value={settingsForm.tariffTndPerKwh} onChange={(e) => setSettingsForm({ ...settingsForm, tariffTndPerKwh: e.target.value })} />
          </div>
          <button className="btn-submit" type="submit">Save settings</button>
        </form>
      </section>

      <section className="section panel panel-pad">
        <div className="section-head">
          <h2>Add device without code changes</h2>
          <span className="muted">Use the same MQTT payload with a new device name</span>
        </div>
        {message ? <div className={message.startsWith("Error") ? "error" : "success-box"}>{message}</div> : null}
        <form className="form-grid" onSubmit={saveDevice}>
          <div className="form-group">
            <label>Device key</label>
            <input className="text-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="microwave" required />
          </div>
          <div className="form-group">
            <label>Display label</label>
            <input className="text-input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Microwave" />
          </div>
          <div className="form-group">
            <label>MQTT topic</label>
            <input className="text-input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="maison/microwave" />
          </div>
          <button className="btn-submit" type="submit">Add device</button>
        </form>
      </section>

      <section className="section panel panel-pad">
        <div className="section-head">
          <h2>Registered / discovered devices</h2>
          <span className="muted">{registry.length} devices</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Topic</th>
              <th>Source</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {registry.map((device) => (
              <tr key={device.name}>
                <td>{prettyDevice(device.name)}</td>
                <td><code>{device.topic}</code></td>
                <td>{device.autoDiscovered ? "Auto discovered" : "Configured"}</td>
                <td>
                  <button className="btn-delete" onClick={() => removeDevice(device.name)} disabled={device.autoDiscovered}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

async function fetchJsonPost(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function AuthPage({ onAuth }) {
  const [registerMode, setRegisterMode] = React.useState(false);
  const [name, setName] = React.useState("Admin");
  const [email, setEmail] = React.useState("admin@smart.house");
  const [password, setPassword] = React.useState("123456");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");

  async function submit(event) {
    event.preventDefault();
    setMessage("");

    if (!email.includes("@") || password.length < 4) {
      setMessage("Check email and password.");
      return;
    }

    setLoading(true);
    try {
      const payload = await fetchJsonPost(registerMode ? "/api/auth/register" : "/api/auth/login", {
        name,
        email,
        password,
      });
      localStorage.setItem("smart-house-user", JSON.stringify(payload.user));
      localStorage.setItem("smart-house-token", payload.token || "");
      onAuth(payload.user || { name, email });
    } catch (err) {
      setMessage(`Authentication failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <main className="auth-shell">
        <form className="auth-card" onSubmit={submit}>
          <div className="brand auth-brand">
            <div className="brand-icon">H</div>
            <div>
              <h1>Smart House</h1>
              <p>Energy Monitoring</p>
            </div>
          </div>
          <h2>{registerMode ? "Create Account" : "Welcome Back"}</h2>
          <p className="muted">Connect to your smart home dashboard.</p>

          {registerMode ? (
            <div className="form-group">
              <label>Name</label>
              <input className="text-input" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
          ) : null}

          <div className="form-group">
            <label>Email</label>
            <input className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input className="text-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>

          {message ? <div className="error">{message}</div> : null}

          <button className="btn-submit" type="submit" disabled={loading}>
            {loading ? "Please wait..." : registerMode ? "Register" : "Login"}
          </button>
          <button className="theme-btn auth-switch" type="button" onClick={() => setRegisterMode((value) => !value)}>
            {registerMode ? "I already have an account" : "Create new account"}
          </button>
        </form>
      </main>
    </div>
  );
}

function DiagnosticsPage({ diagnostics, error, lastRefresh }) {
  const memoryMb = diagnostics?.memory?.rss ? diagnostics.memory.rss / 1024 / 1024 : 0;

  return (
    <>
      <div className="section-head">
        <h2>Network Diagnostics</h2>
        <span className="muted">Last refresh: {lastRefresh ? timeOnly(lastRefresh) : "--"}</span>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="hero-grid">
        <div className="panel mini-card">
          <div className="icon">API</div>
          <h3>Node API</h3>
          <strong>{error ? "DOWN" : "OK"}</strong>
        </div>
        <div className="panel mini-card">
          <div className="icon">MQTT</div>
          <h3>MQTT broker</h3>
          <strong>{diagnostics?.mqttConnected ? "Connected" : "Check"}</strong>
        </div>
        <div className="panel mini-card">
          <div className="icon">RAM</div>
          <h3>Backend memory</h3>
          <strong>{memoryMb.toFixed(1)} MB</strong>
        </div>
      </div>

      <section className="section panel panel-pad">
        <h2>Raw diagnostics</h2>
        <pre style={{ whiteSpace: "pre-wrap", color: "var(--muted)" }}>{JSON.stringify(diagnostics || {}, null, 2)}</pre>
      </section>
    </>
  );
}

function App() {
  const [user, setUser] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("smart-house-user") || "null");
    } catch (err) {
      return null;
    }
  });
  const [activeTab, setActiveTab] = React.useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [theme, setTheme] = React.useState(() => localStorage.getItem("smart-house-theme") || "light");
  const [summary, setSummary] = React.useState({ devices: [] });
  const [history, setHistory] = React.useState([]);
  const [energy, setEnergy] = React.useState([]);
  const [alerts, setAlerts] = React.useState([]);
  const [diagnostics, setDiagnostics] = React.useState(null);
  const [dailyStats, setDailyStats] = React.useState(null);
  const [deviceHealth, setDeviceHealth] = React.useState([]);
  const [billing, setBilling] = React.useState(null);
  const [calendar, setCalendar] = React.useState([]);
  const [language, setLanguage] = React.useState(() => localStorage.getItem("smart-house-language") || "en");
  const [appSettings, setAppSettings] = React.useState({
    monthlyBudgetTnd: MONTHLY_BUDGET_TND,
    tariffTndPerKwh: TARIFF_TND_PER_KWH,
  });
  const [registry, setRegistry] = React.useState([]);
  const [selectedDevice, setSelectedDevice] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [lastRefresh, setLastRefresh] = React.useState(null);

  const devices = (summary.devices || []).filter((item) => item.device !== "total");

  const loadData = React.useCallback(async () => {
    try {
      const [summaryData, historyData, energyData, activeAlertsData, diagnosticsData, dailyStatsData, appStateData, registryData, healthData, billingData, calendarData] = await Promise.all([
        fetchJson("/api/summary"),
        fetchJson("/api/history?minutes=60"),
        fetchJson("/api/energy?minutes=60"),
        fetchJson("/api/alerts?minutes=60"),
        fetchJson("/api/diagnostics"),
        fetchJson("/api/daily-stats"),
        fetchJson("/api/app-state"),
        fetchJson("/api/admin/devices"),
        fetchJson("/api/device-health"),
        fetchJson("/api/billing/estimate"),
        fetchJson("/api/energy-calendar"),
      ]);
      const alertsData = await fetchJson("/api/alerts/history?limit=100").catch(() => activeAlertsData);

      setSummary(summaryData || { devices: [] });
      setHistory(Array.isArray(historyData) ? historyData : []);
      setEnergy(Array.isArray(energyData) ? energyData : []);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setDiagnostics(diagnosticsData || null);
      setDailyStats(dailyStatsData || null);
      setDeviceHealth(Array.isArray(healthData) ? healthData : []);
      setBilling(billingData || null);
      setCalendar(Array.isArray(calendarData) ? calendarData : []);
      setAppSettings(appStateData?.settings || {
        monthlyBudgetTnd: MONTHLY_BUDGET_TND,
        tariffTndPerKwh: TARIFF_TND_PER_KWH,
      });
      setRegistry(Array.isArray(registryData) ? registryData : []);
      setError("");
      setLastRefresh(new Date().toISOString());
    } catch (err) {
      setError(`Connection problem: ${err.message}. Start Node backend on port 3001.`);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
    const timer = setInterval(loadData, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadData]);

  React.useEffect(() => {
    localStorage.setItem("smart-house-theme", theme);
  }, [theme]);

  React.useEffect(() => { localStorage.setItem("smart-house-language", language); }, [language]);

  async function turnOffDevice(device) {
    await fetchJsonPost(`/api/devices/${encodeURIComponent(device)}/control`, { action: "off" });
    loadData();
  }

  async function markAlertRead(id) {
    if (!id) return;
    await fetchJsonPost(`/api/alerts/${encodeURIComponent(id)}/read`, {});
    loadData();
  }

  async function saveSettings(settings) {
    const saved = await fetchJsonPost("/api/settings", settings);
    setAppSettings(saved);
    loadData();
  }

  function logout() {
    localStorage.removeItem("smart-house-user");
    localStorage.removeItem("smart-house-token");
    setUser(null);
  }

  if (!user) {
    return <AuthPage onAuth={setUser} />;
  }

  return (
    <div className="app" data-theme={theme}>
      <header className="topbar">
        <div className="brand-group">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
          <div className="brand">
            <div className="brand-icon">H</div>
            <div>
              <h1>Smart House</h1>
              <p>Energy Monitoring</p>
            </div>
          </div>
        </div>

        <nav className="topbar-nav">
          <button className={`topbar-nav-btn ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
            📊 Dashboard
          </button>
          <button className={`topbar-nav-btn ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
            📄 Reports
          </button>
          <button className={`topbar-nav-btn ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
            ⚙️ Settings
          </button>
          <button className={`topbar-nav-btn ${activeTab === "diagnostics" ? "active" : ""}`} onClick={() => setActiveTab("diagnostics")}>
            📡 Diagnostics
          </button>
          <button className={`topbar-nav-btn ${activeTab === "notifications" ? "active" : ""}`} onClick={() => setActiveTab("notifications")}>
            ! Notifications
          </button>
          <button className={`topbar-nav-btn ${activeTab === "assistant" ? "active" : ""}`} onClick={() => setActiveTab("assistant")}>
            🤖 Assistant
          </button>
          <button className={`topbar-nav-btn ${activeTab === "profile" ? "active" : ""}`} onClick={() => setActiveTab("profile")}>Profile</button>
        </nav>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="status-pill">{user.name || user.email}</span>
          <span className="status-pill"><span className="dot" /> {error ? "Offline" : "Live"}</span>
          <button className="theme-btn" onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button className="theme-btn" onClick={() => setLanguage((value) => value === "en" ? "fr" : "en")}>{language === "en" ? "Français" : "English"}</button>
          <button className="theme-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <SidebarDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        theme={theme}
        onToggleTheme={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
      />

      <main className="layout">
        {error && activeTab === "dashboard" ? <div className="error">{error}</div> : null}

        {activeTab === "dashboard" ? (
          <DashboardPage
            summary={summary}
            history={history}
            energy={energy}
            alerts={alerts}
            deviceHealth={deviceHealth}
            billing={billing}
            theme={theme}
            settings={appSettings}
            loading={loading}
            onOpenDevice={setSelectedDevice}
            onTurnOffDevice={turnOffDevice}
          />
        ) : null}

        {activeTab === "reports" ? <><ReportsPage history={history} energy={energy} devices={devices} dailyStats={dailyStats} /><EnergyCalendar entries={calendar} /></> : null}

        {activeTab === "settings" ? (
          <SettingsPage devices={devices} registry={registry} settings={appSettings} onSaveSettings={saveSettings} onRefresh={loadData} />
        ) : null}

        {activeTab === "diagnostics" ? (
          <DiagnosticsPage diagnostics={diagnostics} error={error} lastRefresh={lastRefresh} />
        ) : null}

        {activeTab === "notifications" ? (
          <NotificationsPage alerts={alerts} onMarkRead={markAlertRead} />
        ) : null}

        {activeTab === "assistant" ? <AssistantChat /> : null}
        {activeTab === "profile" ? <ProfilePage user={user} onSave={setUser} /> : null}
      </main>

      {selectedDevice ? (
        <DeviceDetailModal
          deviceReading={selectedDevice}
          allAlerts={alerts}
          theme={theme}
          onClose={() => setSelectedDevice(null)}
        />
      ) : null}
    </div>
  );
}

export default App;
