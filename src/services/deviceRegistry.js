const fs = require("fs");
const path = require("path");
const config = require("../config");

const dataDir = path.join(__dirname, "..", "..", "data");
const registryPath = path.join(dataDir, "devices.json");

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

function defaultDevices() {
  const basePowers = {
    frigo: 150,
    fridge: 150,
    machine_cafe: 1250,
    cafe: 1250,
    microwave: 900,
    microondes: 900,
    tv: 120,
    laptop: 65,
  };
  return config.devices
    .filter((device) => device !== "total")
    .map((name) => ({
      name,
      label: name.replace(/_/g, " "),
      topic: `maison/${name}`,
      basePower: basePowers[name] || 200,
      enabled: true,
      createdAt: new Date().toISOString(),
    }));
}

function ensureRegistry() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(registryPath)) {
    fs.writeFileSync(registryPath, JSON.stringify(defaultDevices(), null, 2));
  }
}

function readDevices() {
  ensureRegistry();

  try {
    const devices = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    return Array.isArray(devices) ? devices : [];
  } catch (err) {
    return [];
  }
}

function writeDevices(devices) {
  ensureRegistry();
  fs.writeFileSync(registryPath, JSON.stringify(devices, null, 2));
}

function listDevices() {
  return readDevices().sort((a, b) => a.name.localeCompare(b.name));
}

function addDevice(input) {
  const name = normalizeName(input.name || input.device);

  if (!name) {
    throw new Error("Device name is required");
  }

  const devices = readDevices();
  const existing = devices.find((device) => device.name === name);
  const next = {
    name,
    label: String(input.label || name.replace(/_/g, " ")).trim(),
    topic: String(input.topic || `maison/${name}`).trim(),
    basePower: Number(input.basePower || input.power || 250),
    enabled: input.enabled !== false,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  if (existing) {
    Object.assign(existing, next);
  } else {
    devices.push(next);
  }

  writeDevices(devices);
  return next;
}

function removeDevice(name) {
  const normalized = normalizeName(name);
  const devices = readDevices();
  const next = devices.filter((device) => device.name !== normalized);

  writeDevices(next);
  return devices.length !== next.length;
}

module.exports = {
  addDevice,
  listDevices,
  normalizeName,
  removeDevice,
};
