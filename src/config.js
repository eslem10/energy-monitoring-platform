const config = {
  api: {
    host: process.env.API_HOST || "127.0.0.1",
    port: Number(process.env.API_PORT || 3001),
  },
  mqtt: {
    url: process.env.MQTT_URL || "mqtt://broker.emqx.io:1883",
    topic: process.env.MQTT_TOPIC || "maison/+",
  },
  influx: {
    url: process.env.INFLUX_URL || "http://localhost:8086",
    token:
      process.env.INFLUX_TOKEN ||
      "kUEeg2bl5_RYbeeWR-DdNnNadjsj_aAme4af5Jacj4bxGoB5Ndd8PJ5GljHXe8lUs56nGaV6f_U_Es-7ZYORtw==",
    org: process.env.INFLUX_ORG || "smart_home",
    bucket: process.env.INFLUX_BUCKET || "energy",
  },
  devices: ["frigo", "machine_cafe", "laptop", "microwave", "tv", "total"],
  source: "stm32mp15",
};

module.exports = config;
