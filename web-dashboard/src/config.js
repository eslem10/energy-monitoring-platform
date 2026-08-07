export const API_URL = window.location.origin.includes("3001") ? "" : "http://127.0.0.1:3001";
export const REFRESH_MS = 5000;

export const colors = {
  frigo: "#2f80ed",
  fridge: "#2f80ed",
  machine_cafe: "#ffb020",
  cafe: "#ffb020",
  microwave: "#ff4d5e",
  microondes: "#ff4d5e",
  tv: "#16bf76",
  laptop: "#7b61ff",
  total: "#087b54",
};

export const icons = {
  frigo: "❄",
  fridge: "❄",
  machine_cafe: "☕",
  cafe: "☕",
  microwave: "▣",
  microondes: "▣",
  tv: "📺",
  laptop: "💻",
  total: "⚡",
};

export function prettyDevice(device) {
  return String(device || "unknown")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function deviceColor(device) {
  return colors[device] || "#087b54";
}

export function deviceIcon(device) {
  return icons[device] || "🔌";
}

export function formatPower(value) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(2)} kW`;
  return `${number < 10 && number % 1 !== 0 ? number.toFixed(1) : Math.round(number)} W`;
}

export function formatWh(value) {
  const number = Number(value || 0);
  if (number >= 1000) return `${(number / 1000).toFixed(2)} kWh`;
  return `${number.toFixed(2)} Wh`;
}

export function timeOnly(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
