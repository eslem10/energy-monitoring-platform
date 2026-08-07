const { parseMinutes, readJsonBody, sendJson } = require("./http");
const deviceRegistry = require("./services/deviceRegistry");
const influxService = require("./services/influxService");
const { publishControl, getMqttStatus } = require("./services/mqttService");
const assistantService = require("./services/assistantService");
const authService = require("./services/authService");
const alertHistoryService = require("./services/alertHistoryService");
const appStateService = require("./services/appStateService");

function getDeviceFromPath(pathname) {
  const match = pathname.match(/^\/api\/devices\/([^/]+)\/(latest|history)$/);
  return match ? { device: match[1], action: match[2] } : null;
}

async function handleApiRequest(req, res, requestUrl) {
  if (requestUrl.pathname === "/api/app-state" && req.method === "GET") {
    sendJson(res, 200, appStateService.readState());
    return;
  }

  if (requestUrl.pathname === "/api/settings") {
    if (req.method === "GET") {
      sendJson(res, 200, appStateService.readState().settings);
      return;
    }
    if (req.method === "POST") {
      sendJson(res, 200, appStateService.updateSettings(await readJsonBody(req)));
      return;
    }
  }

  if (requestUrl.pathname === "/api/favorites") {
    if (req.method === "GET") {
      sendJson(res, 200, appStateService.readState().favorites);
      return;
    }
    if (req.method === "POST") {
      sendJson(res, 200, appStateService.updateFavorites(await readJsonBody(req)));
      return;
    }
  }

  if (requestUrl.pathname === "/api/scenes") {
    if (req.method === "GET") {
      sendJson(res, 200, appStateService.readState().scenes);
      return;
    }
    if (req.method === "POST") {
      sendJson(res, 201, appStateService.saveScene(await readJsonBody(req)));
      return;
    }
  }

  const deleteSceneMatch = requestUrl.pathname.match(/^\/api\/scenes\/([^/]+)$/);
  if (deleteSceneMatch && req.method === "DELETE") {
    sendJson(res, 200, appStateService.deleteScene(decodeURIComponent(deleteSceneMatch[1])));
    return;
  }

  if (requestUrl.pathname === "/api/auth/register" && req.method === "POST") {
    try {
      sendJson(res, 201, authService.register(await readJsonBody(req)));
    } catch (err) {
      sendJson(res, err.statusCode || 400, { error: err.message });
    }
    return;
  }

  if (requestUrl.pathname === "/api/auth/login" && req.method === "POST") {
    try {
      sendJson(res, 200, authService.login(await readJsonBody(req)));
    } catch (err) {
      sendJson(res, err.statusCode || 400, { error: err.message });
    }
    return;
  }

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

  if (requestUrl.pathname === "/api/diagnostics") {
    sendJson(res, 200, {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      mqttConnected: getMqttStatus(),
      pid: process.pid,
    });
    return;
  }

  if (requestUrl.pathname === "/api/devices") {
    sendJson(res, 200, await influxService.getDevices());
    return;
  }

  if (requestUrl.pathname === "/api/chat" && req.method === "POST") {
    const body = await readJsonBody(req);
    const message = body?.prompt || body?.message || "";
    const reply = await assistantService.processChat(message);
    sendJson(res, 200, { response: reply, reply });
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
    const activeAlerts = await influxService.getAlerts({ minutes });
    sendJson(res, 200, alertHistoryService.recordActiveAlerts(activeAlerts));
    return;
  }

  if (requestUrl.pathname === "/api/alerts/history" || requestUrl.pathname === "/api/notifications") {
    if (req.method === "GET") {
      sendJson(res, 200, alertHistoryService.listHistory({
        limit: requestUrl.searchParams.get("limit"),
        unreadOnly: requestUrl.searchParams.get("unreadOnly") === "true",
      }));
      return;
    }

    if (req.method === "DELETE") {
      alertHistoryService.clearHistory();
      sendJson(res, 200, { cleared: true });
      return;
    }
  }

  const readAlertMatch = requestUrl.pathname.match(/^\/api\/alerts\/([^/]+)\/read$/);
  if (readAlertMatch && req.method === "POST") {
    const alert = alertHistoryService.acknowledgeAlert(decodeURIComponent(readAlertMatch[1]));
    sendJson(res, alert ? 200 : 404, alert || { error: "Alert not found" });
    return;
  }

  if (requestUrl.pathname === "/api/energy") {
    const minutes = parseMinutes(requestUrl.searchParams.get("minutes"));
    sendJson(res, 200, await influxService.getEnergyByDevice({ minutes }));
    return;
  }

  if (requestUrl.pathname === "/api/daily-stats") {
    sendJson(res, 200, await influxService.getDailyStats());
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
