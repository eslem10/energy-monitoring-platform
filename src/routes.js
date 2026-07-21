const { parseMinutes, readJsonBody, sendJson } = require("./http");
const deviceRegistry = require("./services/deviceRegistry");
const influxService = require("./services/influxService");
const { publishControl } = require("./services/mqttService");

function getDeviceFromPath(pathname) {
  const match = pathname.match(/^\/api\/devices\/([^/]+)\/(latest|history)$/);
  return match ? { device: match[1], action: match[2] } : null;
}

async function handleApiRequest(req, res, requestUrl) {
  if (requestUrl.pathname === "/api/admin/devices") {
    if (req.method === "GET") {
      const [registered, measured] = await Promise.all([
        deviceRegistry.listDevices(),
        influxService.getDevices({ includeTotal: false }),
      ]);
      const registeredNames = new Set(registered.map((device) => device.name));
      const measuredOnly = measured
        .filter((name) => !registeredNames.has(name))
        .map((name) => ({
          name,
          label: name.replace(/_/g, " "),
          topic: `maison/${name}`,
          enabled: true,
          autoDiscovered: true,
        }));

      sendJson(res, 200, [...registered, ...measuredOnly]);
      return;
    }

    if (req.method === "POST") {
      const device = deviceRegistry.addDevice(await readJsonBody(req));
      sendJson(res, 201, device);
      return;
    }
  }

  const deleteDeviceMatch = requestUrl.pathname.match(/^\/api\/admin\/devices\/([^/]+)$/);
  if (deleteDeviceMatch && req.method === "DELETE") {
    const deleted = deviceRegistry.removeDevice(decodeURIComponent(deleteDeviceMatch[1]));
    sendJson(res, deleted ? 200 : 404, { deleted });
    return;
  }

  if (requestUrl.pathname === "/api/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "smart-house-backend",
      devices: await influxService.getDevices(),
    });
    return;
  }

  if (requestUrl.pathname === "/api/devices") {
    sendJson(res, 200, await influxService.getDevices());
    return;
  }

  const controlMatch = requestUrl.pathname.match(/^\/api\/devices\/([^/]+)\/control$/);
  if (controlMatch && req.method === "POST") {
    const device = decodeURIComponent(controlMatch[1]);
    const body = await readJsonBody(req);
    const action = body?.action === "on" ? "on" : "off";
    const published = publishControl(device, action);
    sendJson(res, published ? 200 : 503, { ok: published, device, action });
    return;
  }

  if (requestUrl.pathname === "/api/latest") {
    sendJson(res, 200, await influxService.getLatestPower({ includeTotal: true }));
    return;
  }

  if (requestUrl.pathname === "/api/summary") {
    sendJson(res, 200, await influxService.getSummary());
    return;
  }

  if (requestUrl.pathname === "/api/history") {
    const minutes = parseMinutes(requestUrl.searchParams.get("minutes"));
    const device = requestUrl.searchParams.get("device");
    sendJson(res, 200, await influxService.getHistory({ minutes, device }));
    return;
  }

  if (requestUrl.pathname === "/api/status") {
    sendJson(res, 200, await influxService.getStatus());
    return;
  }

  if (requestUrl.pathname === "/api/alerts") {
    const minutes = parseMinutes(requestUrl.searchParams.get("minutes"));
    sendJson(res, 200, await influxService.getAlerts({ minutes }));
    return;
  }

  if (requestUrl.pathname === "/api/energy") {
    const minutes = parseMinutes(requestUrl.searchParams.get("minutes"));
    sendJson(res, 200, await influxService.getEnergyByDevice({ minutes }));
    return;
  }

  const deviceRoute = getDeviceFromPath(requestUrl.pathname);
  if (deviceRoute) {
    if (deviceRoute.action === "latest") {
      const rows = await influxService.getLatestPower({
        device: deviceRoute.device,
        includeTotal: true,
      });
      sendJson(res, 200, rows[0] || null);
      return;
    }

    if (deviceRoute.action === "history") {
      const minutes = parseMinutes(requestUrl.searchParams.get("minutes"));
      sendJson(res, 200, await influxService.getHistory({ minutes, device: deviceRoute.device }));
      return;
    }
  }

  sendJson(res, 404, { error: "Not found" });
}

module.exports = {
  handleApiRequest,
};
