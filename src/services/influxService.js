const { InfluxDB, Point } = require("@influxdata/influxdb-client");
const config = require("../config");

const influxDB = new InfluxDB({
  url: config.influx.url,
  token: config.influx.token,
});

const writeApi = influxDB.getWriteApi(config.influx.org, config.influx.bucket);
const queryApi = influxDB.getQueryApi(config.influx.org);

const numericFields = [
  "power",
  "voltage",
  "current",
  "frequency",
  "power_factor",
  "reactive_power",
  "apparent_power",
  "energy",
];

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function escapeFluxString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function deviceFilter({ includeTotal = true, device } = {}) {
  if (device) {
    return `r.device == "${escapeFluxString(device)}"`;
  }

  if (includeTotal) {
    return "exists r.device";
  }

  return 'exists r.device and r.device != "total"';
}

async function runFlux(query) {
  const rows = [];

  for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
    rows.push(tableMeta.toObject(values));
  }

  return rows;
}

async function writeMeasurement(data) {
  const device = data.device || "unknown";
  const power = toFiniteNumber(data.power);

  if (power === null) {
    throw new Error(`Invalid power value: ${data.power}`);
  }

  const point = new Point("energy")
    .tag("device", device)
    .tag("source", config.source)
    .floatField("power", power);

  for (const field of numericFields) {
    if (field === "power") {
      continue;
    }

    const value = toFiniteNumber(data[field]);
    if (value !== null) {
      point.floatField(field, value);
    }
  }

  writeApi.writePoint(point);
  await writeApi.flush();
}

async function getDevices({ hours = 168, includeTotal = true } = {}) {
  const rows = await runFlux(`
    import "influxdata/influxdb/schema"

    schema.tagValues(
      bucket: "${config.influx.bucket}",
      tag: "device",
      predicate: (r) => r._measurement == "energy",
      start: -${hours}h
    )
  `);

  return rows
    .map((row) => row._value)
    .filter((device) => device && (includeTotal || device !== "total"))
    .sort();
}

async function getLatestPower({ includeTotal = true, device } = {}) {
  const rows = await runFlux(`
    from(bucket: "${config.influx.bucket}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "energy")
      |> filter(fn: (r) => r._field == "power")
      |> filter(fn: (r) => ${deviceFilter({ includeTotal, device })})
      |> group(columns: ["device"])
      |> last()
      |> keep(columns: ["_time", "_value", "device"])
  `);

  return rows.map((row) => ({
    device: row.device,
    power: row._value,
    time: row._time,
    status:
      row.device === "frigo"
        ? row._value > 20
          ? "Refroidissement"
          : "Inertie thermique"
        : row._value > 5
          ? "ON"
          : "OFF",
  }));
}

async function getHistory({ minutes = 60, includeTotal = true, device } = {}) {
  let every = "30s";
  if (minutes > 1440) {
    every = "15m";
  }
  if (minutes > 10000) {
    every = "1h";
  }

  const rows = await runFlux(`
    from(bucket: "${config.influx.bucket}")
      |> range(start: -${minutes}m)
      |> filter(fn: (r) => r._measurement == "energy")
      |> filter(fn: (r) => r._field == "power")
      |> filter(fn: (r) => ${deviceFilter({ includeTotal, device })})
      |> aggregateWindow(every: ${every}, fn: mean, createEmpty: false)
      |> keep(columns: ["_time", "_value", "device"])
  `);

  return rows.map((row) => ({
    device: row.device,
    power: row._value,
    time: row._time,
  }));
}

async function getSummary() {
  const latest = await getLatestPower({ includeTotal: true });
  const total = latest.find((item) => item.device === "total")?.power ?? null;
  const sumDevices = latest
    .filter((item) => item.device !== "total")
    .reduce((sum, item) => sum + item.power, 0);

  // Get energy consumed in last 24h vs previous 24h
  let todayEnergyWh = 0;
  let yesterdayEnergyWh = 0;

  try {
    const [todayRows, yesterdayRows] = await Promise.all([
      runFlux(`
        from(bucket: "${config.influx.bucket}")
          |> range(start: -24h)
          |> filter(fn: (r) => r._measurement == "energy")
          |> filter(fn: (r) => r._field == "power")
          |> filter(fn: (r) => r.device != "total")
          |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
          |> map(fn: (r) => ({ r with _value: r._value / 12.0 }))
          |> sum()
      `),
      runFlux(`
        from(bucket: "${config.influx.bucket}")
          |> range(start: -48h, stop: -24h)
          |> filter(fn: (r) => r._measurement == "energy")
          |> filter(fn: (r) => r._field == "power")
          |> filter(fn: (r) => r.device != "total")
          |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
          |> map(fn: (r) => ({ r with _value: r._value / 12.0 }))
          |> sum()
      `)
    ]);

    todayEnergyWh = todayRows.reduce((sum, r) => sum + (r._value || 0), 0);
    yesterdayEnergyWh = yesterdayRows.reduce((sum, r) => sum + (r._value || 0), 0);
  } catch (err) {
    console.error("Error querying comparison energy:", err);
  }

  return {
    total,
    sumDevices,
    error: total === null ? null : Math.abs(total - sumDevices),
    devices: latest,
    todayEnergyWh,
    yesterdayEnergyWh,
  };
}

async function getEnergyByDevice({ minutes = 60 } = {}) {
  const rows = await runFlux(`
    from(bucket: "${config.influx.bucket}")
      |> range(start: -${minutes}m)
      |> filter(fn: (r) => r._measurement == "energy")
      |> filter(fn: (r) => r._field == "power")
      |> filter(fn: (r) => ${deviceFilter({ includeTotal: false })})
      |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
      |> map(fn: (r) => ({ r with _value: r._value / 60.0 }))
      |> group(columns: ["device"])
      |> sum(column: "_value")
      |> keep(columns: ["device", "_value"])
  `);

  return rows.map((row) => ({
    device: row.device,
    energyWh: row._value,
  }));
}

async function getEnergyByDeviceWindow({ start, stop = "now()" }) {
  const rows = await runFlux(`
    from(bucket: "${config.influx.bucket}")
      |> range(start: ${start}, stop: ${stop})
      |> filter(fn: (r) => r._measurement == "energy")
      |> filter(fn: (r) => r._field == "power")
      |> filter(fn: (r) => ${deviceFilter({ includeTotal: false })})
      |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
      |> map(fn: (r) => ({ r with _value: r._value / 12.0 }))
      |> group(columns: ["device"])
      |> sum(column: "_value")
      |> keep(columns: ["device", "_value"])
  `);

  return rows.map((row) => ({
    device: row.device,
    energyWh: row._value,
  }));
}

async function getDailyStats() {
  const [todayByDevice, yesterdayByDevice, peakRows, averageRows, weekRows] = await Promise.all([
    getEnergyByDeviceWindow({ start: "-24h" }),
    getEnergyByDeviceWindow({ start: "-48h", stop: "-24h" }),
    runFlux(`
      from(bucket: "${config.influx.bucket}")
        |> range(start: -24h)
        |> filter(fn: (r) => r._measurement == "energy")
        |> filter(fn: (r) => r._field == "power")
        |> filter(fn: (r) => ${deviceFilter({ includeTotal: true })})
        |> max()
        |> keep(columns: ["_value", "device", "_time"])
    `),
    runFlux(`
      from(bucket: "${config.influx.bucket}")
        |> range(start: -24h)
        |> filter(fn: (r) => r._measurement == "energy")
        |> filter(fn: (r) => r._field == "power")
        |> filter(fn: (r) => r.device == "total")
        |> mean()
        |> keep(columns: ["_value"])
    `),
    runFlux(`
      from(bucket: "${config.influx.bucket}")
        |> range(start: -7d)
        |> filter(fn: (r) => r._measurement == "energy")
        |> filter(fn: (r) => r._field == "power")
        |> filter(fn: (r) => ${deviceFilter({ includeTotal: false })})
        |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
        |> map(fn: (r) => ({ r with _value: r._value }))
        |> group(columns: ["device"])
        |> keep(columns: ["_time", "_value", "device"])
    `),
  ]);

  const todayWh = todayByDevice.reduce((sum, item) => sum + Number(item.energyWh || 0), 0);
  const yesterdayWh = yesterdayByDevice.reduce((sum, item) => sum + Number(item.energyWh || 0), 0);
  const changePercent = yesterdayWh > 0 ? ((todayWh - yesterdayWh) / yesterdayWh) * 100 : null;
  const topDevice = todayByDevice.reduce(
    (top, item) => (Number(item.energyWh || 0) > Number(top?.energyWh || 0) ? item : top),
    null,
  );
  const peak = peakRows.reduce(
    (top, row) => (Number(row._value || 0) > Number(top?.power || 0) ? { device: row.device, power: row._value, time: row._time } : top),
    null,
  );
  const weekByDay = weekRows.reduce((groups, row) => {
    const day = String(row._time || "").slice(0, 10);
    const value = Number(row._value || 0);
    groups[day] = (groups[day] || 0) + value;
    return groups;
  }, {});

  return {
    period: "last_24h",
    todayWh,
    yesterdayWh,
    changePercent,
    averagePower: averageRows[0]?._value || 0,
    peakPower: peak?.power || 0,
    peakDevice: peak?.device || null,
    peakTime: peak?.time || null,
    topDevice,
    byDevice: todayByDevice.sort((a, b) => b.energyWh - a.energyWh),
    yesterdayByDevice: yesterdayByDevice.sort((a, b) => b.energyWh - a.energyWh),
    last7Days: Object.entries(weekByDay)
      .map(([date, energyWh]) => ({ date, energyWh }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

async function getStatus() {
  const latest = await getLatestPower({ includeTotal: false });

  return latest.map((item) => ({
    device: item.device,
    power: item.power,
    status: item.status,
    time: item.time,
  }));
}

function highPowerThreshold(device) {
  const thresholds = {
    microwave: 1000,
    machine_cafe: 800,
    laptop: 100,
    tv: 120,
    frigo: 250,
  };

  return thresholds[device] || 500;
}

function activeThreshold(device) {
  return device === "frigo" ? 20 : 5;
}

function alertRank(level) {
  return { critical: 3, warning: 2, info: 1 }[level] || 0;
}

async function getAlerts({ minutes = 60 } = {}) {
  const [latest, history] = await Promise.all([
    getLatestPower({ includeTotal: false }),
    getHistory({ minutes, includeTotal: false }),
  ]);
  const historyByDevice = history.reduce((groups, point) => {
    groups[point.device] = groups[point.device] || [];
    groups[point.device].push(point);
    return groups;
  }, {});
  const alerts = [];

  for (const reading of latest) {
    const threshold = highPowerThreshold(reading.device);

    if (reading.power >= threshold) {
      alerts.push({
        title: "High consumption",
        device: reading.device,
        reason: `${reading.device} is consuming more than ${threshold} W.`,
        power: reading.power,
        time: reading.time,
        level: reading.power >= threshold * 1.5 ? "critical" : "warning",
      });
    }

    const points = historyByDevice[reading.device] || [];
    const recent = points.slice(-20);
    const longRunning =
      recent.length >= 8 && recent.every((point) => point.power > activeThreshold(reading.device));

    if (longRunning && reading.device !== "frigo") {
      alerts.push({
        title: "Long running device",
        device: reading.device,
        reason: `${reading.device} stayed active for a long period without stopping.`,
        power: reading.power,
        time: recent[recent.length - 1]?.time || reading.time,
        level: "warning",
      });
    }

    if (reading.device === "frigo" && reading.status === "Refroidissement") {
      alerts.push({
        title: "Cooling cycle",
        device: reading.device,
        reason: "The refrigerator compressor is running to reduce temperature.",
        power: reading.power,
        time: reading.time,
        level: "info",
      });
    }
  }

  return alerts.sort((a, b) => alertRank(b.level) - alertRank(a.level));
}

async function close() {
  await writeApi.close();
}

module.exports = {
  close,
  getAlerts,
  getDevices,
  getEnergyByDevice,
  getDailyStats,
  getHistory,
  getLatestPower,
  getStatus,
  getSummary,
  writeMeasurement,
};
