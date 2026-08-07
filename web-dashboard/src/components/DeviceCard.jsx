import React from "react";
import { deviceColor, deviceIcon, formatPower, prettyDevice } from "../config";

export function DeviceCard({ reading, onClick }) {
  const color = deviceColor(reading.device);
  const isOff = reading.status === "OFF" || Number(reading.power) <= 5;
  return (
    <div className="panel device-card clickable-device" onClick={() => onClick(reading)}>
      <div className="device-top">
        <div className="device-icon" style={{ background: color }}>{deviceIcon(reading.device)}</div>
        <span className={`badge ${isOff ? "off" : ""}`}>{reading.status || "ON"}</span>
      </div>
      <p className="device-name">{prettyDevice(reading.device)}</p>
      <p className="device-power" style={{ color }}>{formatPower(reading.power)}</p>
      <div className="device-hint">Click for details ➔</div>
    </div>
  );
}
