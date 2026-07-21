const mqtt = require("mqtt");
const config = require("../config");

let mqttClient = null;

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

  return client;
}

function publishControl(deviceName, action) {
  if (!mqttClient || !mqttClient.connected) {
    return false;
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

module.exports = {
  startMqttIngestion,
  publishControl,
};
