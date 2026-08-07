import React from "react";
import { deviceColor, formatPower, prettyDevice } from "../config";

export function GaugeCard({ reading, maxPower, onClick }) {
  const value = Math.min(100, (Number(reading.power || 0) / Math.max(1, maxPower)) * 100);
  const color = deviceColor(reading.device);
  
  return (
    <div className="panel gauge-card clickable-device" onClick={() => onClick(reading)}>
      <div className="gauge" style={{ "--value": value, "--gauge-color": color }}>
        <div className="gauge-inner">
          <strong>{formatPower(reading.power)}</strong>
        </div>
      </div>
      <strong>{prettyDevice(reading.device)}</strong>
      <div className="device-hint" style={{ justifyContent: "center" }}>Details ➔</div>
    </div>
  );
}
