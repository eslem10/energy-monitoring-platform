const mqtt = require("mqtt");
const config = require("../config");
const deviceRegistry = require("./deviceRegistry");

let mqttClient = null;
let simulationTimer = null;
const deviceStates = {};

function normalizeMessage(topic, message) {
  const data = JSON.parse(message.toString());
  const topicDevice = topic.split("/")[1];
  const device = data.device || topicDevice || "unknown";
  const power = Number(data.power);

  if (!Number.isFinite(power)) {
    throw new Error(`Invalid power value: ${data.power}`);
  }

  return {
    ...data,
    device,
    power,
  };
}

function startTelemetryPublisher(client, onMeasurement) {
  if (process.env.SIMULATION !== "true") {
    return;
  }
  if (simulationTimer) clearInterval(simulationTimer);

  simulationTimer = setInterval(async () => {
    try {
      const devices = deviceRegistry.listDevices().filter((d) => d.enabled !== false);
      for (const dev of devices) {
        const name = dev.name;
        if (!deviceStates[name]) {
          deviceStates[name] = { state: "ON", basePower: dev.basePower || 200 };
        }

        const currentState = deviceStates[name];
        let power = 0;
        if (currentState.state === "ON") {
          const base = dev.basePower || currentState.basePower || 200;
          const jitter = (Math.random() - 0.5) * 0.2 * base;
          power = Math.max(5, Math.round(base + jitter));
        }

        const payload = {
          device: name,
          power: power,
          voltage: Math.round((225 + (Math.random() - 0.5) * 4) * 10) / 10,
          current: Math.round(((power / 230) || 0) * 100) / 100,
          status: currentState.state,
          timestamp: new Date().toISOString(),
        };

        const topic = `maison/${name}`;
        if (client && client.connected) {
          client.publish(topic, JSON.stringify(payload));
        } else if (onMeasurement) {
          await onMeasurement(payload).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Simulation error:", err.message);
    }
  }, 5000);
}

function startMqttIngestion({ onMeasurement }) {
  const client = mqtt.connect(config.mqtt.url);
  mqttClient = client;

  client.on("connect", () => {
    console.log("Connected to MQTT Broker!");

    client.subscribe(config.mqtt.topic, (err) => {
      if (err) {
        console.error("MQTT subscribe error:", err.message);
        return;
      }

      console.log(`Subscribed to ${config.mqtt.topic}`);
    });

    startTelemetryPublisher(client, onMeasurement);
  });

  client.on("error", () => {
    startTelemetryPublisher(client, onMeasurement);
  });

  client.on("message", async (topic, message) => {
    try {
      const measurement = normalizeMessage(topic, message);
      console.log(`${measurement.device} power =`, measurement.power, "W");
      await onMeasurement(measurement);
      console.log("Saved to InfluxDB");
    } catch (err) {
      console.error("Message processing error:", err.message);
    }
  });

  // Start initial telemetry publisher immediately
  startTelemetryPublisher(client, onMeasurement);

  return client;
}

function publishControl(deviceName, action) {
  const normName = deviceName.toLowerCase();
  deviceStates[normName] = deviceStates[normName] || {};
  deviceStates[normName].state = action === "on" ? "ON" : "OFF";

  if (!mqttClient || !mqttClient.connected) {
    return true;
  }

  const topic = `maison/${deviceName}/set`;
  const payload = JSON.stringify({
    device: deviceName,
    action,
    at: new Date().toISOString(),
  });

  mqttClient.publish(topic, payload, { qos: 0, retain: false });
  return true;
}

function getMqttStatus() {
  return mqttClient ? mqttClient.connected : false;
}

module.exports = {
  startMqttIngestion,
  publishControl,
  getMqttStatus,
};
