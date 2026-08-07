import React from "react";
import { API_URL, deviceColor, deviceIcon, formatPower, formatWh, prettyDevice } from "../config";
import { DeviceLineChart } from "./charts/DeviceLineChart";

export function DeviceDetailModal({ deviceReading, onClose, allAlerts = [], theme }) {
  const [minutes, setMinutes] = React.useState(60);
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [controlLoading, setControlLoading] = React.useState(false);
  const [status, setStatus] = React.useState(deviceReading.status || "ON");
  const [currentPower, setCurrentPower] = React.useState(deviceReading.power || 0);

  const deviceName = deviceReading.device;
  const color = deviceColor(deviceName);
  const icon = deviceIcon(deviceName);

  const fetchDetail = React.useCallback(async () => {
    try {
      const [histRes, latestRes] = await Promise.all([
        fetch(`${API_URL}/api/devices/${deviceName}/history?minutes=${minutes}`).then((r) => r.json()),
        fetch(`${API_URL}/api/devices/${deviceName}/latest`).then((r) => r.json()).catch(() => null),
      ]);
      setHistory(Array.isArray(histRes) ? histRes : []);
      if (latestRes && latestRes.power !== undefined) {
        setCurrentPower(latestRes.power);
        setStatus(latestRes.status || (latestRes.power > 5 ? "ON" : "OFF"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [deviceName, minutes]);

  React.useEffect(() => {
    fetchDetail();
    const interval = setInterval(fetchDetail, 4000);
    return () => clearInterval(interval);
  }, [fetchDetail]);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleControl = async () => {
    const isOffState = status === "OFF" || Number(currentPower) <= 5;
    const action = isOffState ? "on" : "off";
    setControlLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/devices/${deviceName}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setStatus(action.toUpperCase());
        if (action === "off") setCurrentPower(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setControlLoading(false);
    }
  };

  const powers = history.map((p) => Number(p.power || 0));
  const peakPower = powers.length ? Math.max(...powers) : Number(currentPower);
  const avgPower = powers.length ? Math.round(powers.reduce((a, b) => a + b, 0) / powers.length) : Number(currentPower);

  const totalWh = avgPower * (minutes / 60);
  const TARIFF_PER_KWH = 0.25;
  const hourlyCost = (avgPower / 1000) * TARIFF_PER_KWH;
  const dailyCost = hourlyCost * 24;
  const monthlyCost = dailyCost * 30;

  let loadLabel = "Low Load";
  let loadClass = "load-low";
  if (currentPower > 1000) {
    loadLabel = "High Load";
    loadClass = "load-high";
  } else if (currentPower > 250) {
    loadLabel = "Moderate Load";
    loadClass = "load-mod";
  }

  const deviceAlerts = allAlerts.filter((a) => a.device === deviceName);
  const isOff = status === "OFF" || Number(currentPower) <= 5;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-device-icon" style={{ background: color }}>{icon}</div>
            <div>
              <h2>{prettyDevice(deviceName)}</h2>
              <p>Topic: <code>maison/{deviceName}</code> • Status: <span className={`badge ${isOff ? "off" : ""}`}>{isOff ? "OFF" : "ON"}</span></p>
            </div>
          </div>
          <div className="modal-actions">
            <button className={`control-btn ${isOff ? "on" : "off"}`} onClick={toggleControl} disabled={controlLoading}>
              ⚡ {controlLoading ? "Sending..." : isOff ? "Turn ON" : "Turn OFF"}
            </button>
            <button className="close-btn" onClick={onClose} title="Close (Esc)">✕</button>
          </div>
        </div>

        <div className="detail-kpi-grid">
          <div className="kpi-card highlight">
            <h4>Current Power</h4>
            <p className="value">{formatPower(currentPower)}</p>
            <p className="sub">Live telemetry value</p>
          </div>

          <div className="kpi-card">
            <h4>Peak Power ({minutes}m)</h4>
            <p className="value">{formatPower(peakPower)}</p>
            <p className="sub">Average: {formatPower(avgPower)}</p>
          </div>

          <div className="kpi-card">
            <h4>Energy Usage</h4>
            <p className="value">{formatWh(totalWh)}</p>
            <p className="sub">Over selected {minutes} min</p>
          </div>

          <div className="kpi-card">
            <h4>Est. Daily Cost</h4>
            <p className="value">{dailyCost.toFixed(3)} TND</p>
            <p className="sub">Monthly ~ {monthlyCost.toFixed(2)} TND</p>
          </div>
        </div>

        <div className="filter-bar">
          <h3 style={{ margin: 0, fontSize: "16px" }}>Consumption Curve Over Time</h3>
          <div className="time-btn-group">
            {[15, 60, 360, 1440].map((m) => (
              <button
                key={m}
                className={`time-btn ${minutes === m ? "active" : ""}`}
                onClick={() => setMinutes(m)}
              >
                {m === 15 ? "15m" : m === 60 ? "1h" : m === 360 ? "6h" : "24h"}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-chart-wrap">
          {loading ? <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>Loading metrics history...</div> : <DeviceLineChart points={history} color={color} theme={theme} />}
        </div>

        <div className="extra-info-grid">
          <div className="info-box">
            <h3>⚡ Performance & Load Level</h3>
            <p>Current Load Rating: <span className={`load-indicator ${loadClass}`}>{loadLabel}</span></p>
            <div className="cost-row">
              <span className="muted">Operational State</span>
              <strong>{isOff ? "Standby / Idle" : "Active / Operational"}</strong>
            </div>
            <div className="cost-row">
              <span className="muted">Recorded Points</span>
              <strong>{history.length} data points</strong>
            </div>
          </div>

          <div className="info-box">
            <h3>💰 Energy Cost Analysis (TND)</h3>
            <div className="cost-row">
              <span className="muted">Tariff Rate</span>
              <strong>0.250 TND / kWh</strong>
            </div>
            <div className="cost-row">
              <span className="muted">Hourly Cost</span>
              <strong>{hourlyCost.toFixed(4)} TND / h</strong>
            </div>
            <div className="cost-row">
              <span className="muted">Est. Monthly Cost (24/7)</span>
              <strong>{monthlyCost.toFixed(3)} TND</strong>
            </div>
          </div>

          <div className="info-box">
            <h3>⚠️ Device Notifications & Alerts</h3>
            {deviceAlerts.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: "13px" }}>No active alerts for this device in the last hour.</p>
            ) : (
              deviceAlerts.slice(0, 3).map((alert, idx) => (
                <div className="alert" key={idx} style={{ padding: "8px 0" }}>
                  <div className="alert-icon" style={{ width: "30px", height: "30px", fontSize: "12px" }}>!</div>
                  <div style={{ fontSize: "12px" }}>
                    <strong>{alert.title}</strong>
                    <div className="muted">{alert.reason}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
