#!/usr/bin/env python3
"""Laptop MQTT bridge: HiveMQ source -> Smart House MQTT topic."""

from mqtt_device_bridge import run_bridge


if __name__ == "__main__":
    run_bridge(
        description="Laptop MQTT -> Smart House MQTT bridge",
        device="laptop",
        source_topic="nilm/laptop/mcp39f511",
    )
