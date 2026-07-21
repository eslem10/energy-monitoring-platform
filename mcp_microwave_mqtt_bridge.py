#!/usr/bin/env python3
"""Microwave MQTT bridge: HiveMQ source -> Smart House MQTT topic."""

from mqtt_device_bridge import run_bridge


if __name__ == "__main__":
    run_bridge(
        description="Microwave MQTT -> Smart House MQTT bridge",
        device="microwave",
        source_topic="labSynergie_microwave_esp32_87A2/energy/data",
    )
