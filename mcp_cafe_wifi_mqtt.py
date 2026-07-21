#!/usr/bin/env python3
"""Cafe MQTT bridge: HiveMQ source -> Smart House MQTT topic."""

from mqtt_device_bridge import run_bridge


if __name__ == "__main__":
    run_bridge(
        description="Cafe MQTT -> Smart House MQTT bridge",
        device="machine_cafe",
        source_topic="nilm/coffe/mcp39f511",
    )
