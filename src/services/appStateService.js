const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "..", "data");
const statePath = path.join(dataDir, "app-state.json");

const defaultState = {
  settings: {
    monthlyBudgetTnd: 30,
    tariffTndPerKwh: 0.25,
  },
  favorites: [],
  scenes: [],
};

function ensureStateFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(statePath)) {
    fs.writeFileSync(statePath, JSON.stringify(defaultState, null, 2));
  }
}

function readState() {
  ensureStateFile();

  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    return {
      ...defaultState,
      ...state,
      settings: { ...defaultState.settings, ...(state.settings || {}) },
      favorites: Array.isArray(state.favorites) ? state.favorites : [],
      scenes: Array.isArray(state.scenes) ? state.scenes : [],
    };
  } catch (err) {
    return { ...defaultState };
  }
}

function writeState(state) {
  ensureStateFile();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function updateSettings(input) {
  const state = readState();
  const monthlyBudgetTnd = Number(input.monthlyBudgetTnd ?? input.monthlyBudget ?? state.settings.monthlyBudgetTnd);
  const tariffTndPerKwh = Number(input.tariffTndPerKwh ?? input.tariff ?? state.settings.tariffTndPerKwh);

  state.settings = {
    monthlyBudgetTnd: Number.isFinite(monthlyBudgetTnd) ? monthlyBudgetTnd : state.settings.monthlyBudgetTnd,
    tariffTndPerKwh: Number.isFinite(tariffTndPerKwh) ? tariffTndPerKwh : state.settings.tariffTndPerKwh,
  };
  writeState(state);
  return state.settings;
}

function updateFavorites(input) {
  const state = readState();
  const favorites = Array.isArray(input.favorites) ? input.favorites : [];
  state.favorites = [...new Set(favorites.map((item) => String(item).trim()).filter(Boolean))];
  writeState(state);
  return state.favorites;
}

function saveScene(input) {
  const state = readState();
  const name = String(input.name || "My scene").trim();
  const scene = {
    name,
    devices: Array.isArray(input.devices) ? input.devices : [],
    updatedAt: new Date().toISOString(),
  };

  state.scenes = [
    ...state.scenes.filter((item) => item.name !== name),
    scene,
  ];
  writeState(state);
  return scene;
}

function deleteScene(name) {
  const state = readState();
  const next = state.scenes.filter((scene) => scene.name !== name);
  state.scenes = next;
  writeState(state);
  return next;
}

module.exports = {
  deleteScene,
  readState,
  saveScene,
  updateFavorites,
  updateSettings,
};
