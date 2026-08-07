import React from "react";
import { formatPower, prettyDevice } from "../config";

export function OverconsumptionBanner({ currentTotal, maxThreshold, activeDevices, onTurnOffDevice }) {
  if (currentTotal <= maxThreshold) return null;

  const excess = currentTotal - maxThreshold;
  const sortedDevices = [...activeDevices]
    .filter((d) => Number(d.power) > 20)
    .sort((a, b) => Number(b.power) - Number(a.power));

  return (
    <div className="overconsumption-banner">
      <div className="overconsumption-info">
        <div className="overconsumption-icon">⚠️</div>
        <div>
          <h3 style={{ margin: 0, fontSize: "18px" }}>High Power Consumption Alert!</h3>
          <p style={{ margin: "4px 0 0", opacity: 0.95, fontSize: "13px" }}>
            Current load: <strong>{formatPower(currentTotal)}</strong> (Exceeds maximum threshold of {formatPower(maxThreshold)} by +{formatPower(excess)})
          </p>
        </div>
      </div>

      <div className="overconsumption-actions">
        <span style={{ fontSize: "12px", fontWeight: 800 }}>Quick Off:</span>
        {sortedDevices.slice(0, 3).map((d) => (
          <button
            key={d.device}
            className="btn-quick-off"
            onClick={() => onTurnOffDevice(d.device)}
            title={`Turn off ${prettyDevice(d.device)} (${formatPower(d.power)})`}
          >
            🔌 Cut {prettyDevice(d.device)} ({formatPower(d.power)})
          </button>
        ))}
      </div>
    </div>
  );
}
