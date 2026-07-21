const { startApiServer } = require("./src/server");
const influxService = require("./src/services/influxService");
const { startMqttIngestion } = require("./src/services/mqttService");

const apiServer = startApiServer();
const mqttClient = startMqttIngestion({
  onMeasurement: influxService.writeMeasurement,
});

async function shutdown() {
  console.log("\nShutting down...");
  mqttClient.end();
  apiServer.close();
  await influxService.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
