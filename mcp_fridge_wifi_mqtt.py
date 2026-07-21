#!/usr/bin/env python3
"""Fridge MQTT bridge: HiveMQ source -> Smart House MQTT topic."""

from mqtt_device_bridge import run_bridge


if __name__ == "__main__":
    run_bridge(
        description="Fridge MQTT -> Smart House MQTT bridge",
        device="frigo",
        source_topic="nilm/appliance/mcp39f511",
    )
