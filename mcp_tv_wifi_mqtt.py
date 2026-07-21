#!/usr/bin/env python3
"""TV MQTT bridge: HiveMQ source -> Smart House MQTT topic."""

from mqtt_device_bridge import run_bridge


if __name__ == "__main__":
    run_bridge(
        description="TV MQTT -> Smart House MQTT bridge",
        device="tv",
        source_topic="nilm/tv/mcp39f511",
    )
