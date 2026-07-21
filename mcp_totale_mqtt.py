#!/usr/bin/env python3
"""
Collect total MCP39F511A measurements from the STM32 over WiFi and publish
the active power to MQTT for the Node.js -> InfluxDB -> Grafana pipeline.

Usage:
    python mcp_totale_mqtt.py --host 192.168.31.50
    python mcp_totale_mqtt.py --host 192.168.31.50 --interval 2
"""

import argparse
import json
import sys
import time
from datetime import datetime

try:
    import requests
except ImportError:
    print("[ERREUR] Installe requests : pip install requests")
    sys.exit(1)

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("[ERREUR] Installe paho-mqtt : pip install paho-mqtt")
    sys.exit(1)


STM32_PORT = 80
MQTT_HOST = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "maison/device"
DEVICE = "total"


def to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class WiFiCollector:
    def __init__(self, host, port, timeout):
        self.url = f"http://{host}:{port}/data"
        self.timeout = timeout
        print(f"[WiFi] Endpoint : {self.url}")

    def fetch(self):
        try:
            response = requests.get(self.url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            if "error" in data:
                print(f"[WiFi] STM32 repond : {data['error']}")
                return None
            return data
        except requests.exceptions.ConnectionError:
            print(f"[WiFi] Impossible de joindre le STM32 ({self.url})")
            return None
        except requests.exceptions.Timeout:
            print(f"[WiFi] Timeout apres {self.timeout}s")
            return None
        except Exception as exc:
            print(f"[WiFi] Erreur : {exc}")
            return None


def build_payload(record):
    power = to_float(record.get("active_power"))
    if power is None:
        print("[WARN] active_power invalide ou absent.")
        return None

    return {
        "device": DEVICE,
        "power": power,
        "voltage": to_float(record.get("voltage")),
        "current": to_float(record.get("current")),
        "frequency": to_float(record.get("frequency")),
        "power_factor": to_float(record.get("power_factor")),
        "reactive_power": to_float(record.get("reactive_power")),
        "apparent_power": to_float(record.get("apparent_power")),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


def main():
    parser = argparse.ArgumentParser(description="Collecte totale STM32 WiFi -> MQTT")
    parser.add_argument("--host", required=True, help="IP du STM32 (ex: 192.168.31.50)")
    parser.add_argument("--port", default=STM32_PORT, type=int)
    parser.add_argument("--interval", default=5, type=float)
    parser.add_argument("--timeout", default=5, type=int)
    parser.add_argument("--mqtt-host", default=MQTT_HOST)
    parser.add_argument("--mqtt-port", default=MQTT_PORT, type=int)
    parser.add_argument("--topic", default=MQTT_TOPIC)
    args = parser.parse_args()

    collector = WiFiCollector(args.host, args.port, args.timeout)
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.connect(args.mqtt_host, args.mqtt_port, 60)
    client.loop_start()

    print(f"[MQTT] Broker : {args.mqtt_host}:{args.mqtt_port}")
    print(f"[MQTT] Topic  : {args.topic}")
    print(f"[INFO] Collecte totale demarree -- intervalle {args.interval}s -- Ctrl+C pour arreter")

    try:
        while True:
            record = collector.fetch()
            if record:
                payload = build_payload(record)
                if payload:
                    client.publish(args.topic, json.dumps(payload), qos=0)
                    print(f"[MQTT] total power = {payload['power']} W")
            else:
                print("[WARN] Mesure ignoree.")
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\n[INFO] Arret.")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
