#!/usr/bin/env python3
"""Bridge one device MQTT topic to the Smart House MQTT topic."""

import argparse
import json
import sys
import time
from datetime import datetime

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("[ERREUR] Installe paho-mqtt : pip install paho-mqtt")
    sys.exit(1)


SOURCE_BROKER = "broker.hivemq.com"
SOURCE_PORT = 1883
DEST_BROKER = "broker.emqx.io"
DEST_PORT = 1883
DEST_TOPIC = "maison/device"


def to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def make_client(client_id):
    try:
        return mqtt.Client(
            client_id=client_id,
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        )
    except (AttributeError, TypeError):
        return mqtt.Client(client_id=client_id)


def is_success(reason_code):
    return reason_code == 0 or str(reason_code).lower() == "success"


def normalize_payload(data, device):
    power = to_float(data.get("power", data.get("active_power")))
    if power is None:
        print("[WARN] power/active_power absent ou invalide.")
        return None

    payload = {
        "device": device,
        "power": power,
        "timestamp": data.get("timestamp") or datetime.utcnow().isoformat() + "Z",
    }

    field_map = {
        "voltage": "voltage",
        "current": "current",
        "frequency": "frequency",
        "power_factor": "power_factor",
        "powerfactor": "power_factor",
        "reactive_power": "reactive_power",
        "apparent_power": "apparent_power",
        "energy": "energy",
        "thermistor": "thermistor",
    }

    for source_key, dest_key in field_map.items():
        value = to_float(data.get(source_key))
        if value is not None:
            payload[dest_key] = value

    return payload


class DeviceBridge:
    def __init__(self, args):
        self.args = args
        suffix = int(time.time())
        self.source = make_client(f"{args.device}-source-{suffix}")
        self.dest = make_client(f"{args.device}-dest-{suffix}")

        self.source.on_connect = self.on_source_connect
        self.source.on_message = self.on_source_message
        self.source.on_disconnect = self.on_source_disconnect

    def on_source_connect(self, client, userdata, flags, reason_code, properties=None):
        if is_success(reason_code):
            print(f"[SOURCE] Connected to {self.args.source_broker}:{self.args.source_port}")
            client.subscribe(self.args.source_topic)
            print(f"[SOURCE] Subscribed to {self.args.source_topic}")
        else:
            print(f"[SOURCE] Connection failed, code={reason_code}")

    def on_source_disconnect(self, client, userdata, *args):
        print("[SOURCE] Disconnected, reconnecting automatically...")

    def on_source_message(self, client, userdata, msg):
        try:
            data = json.loads(msg.payload.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            print(f"[SOURCE] Invalid JSON on {msg.topic}: {exc}")
            return

        if "error" in data or "debug" in data:
            print(f"[SOURCE] Ignored diagnostic message: {data}")
            return

        payload = normalize_payload(data, self.args.device)
        if payload is None:
            return

        self.dest.publish(self.args.dest_topic, json.dumps(payload), qos=0)
        print(f"[DEST] {self.args.device} power = {payload['power']} W")

    def run(self):
        print(f"[DEST] Connecting to {self.args.dest_broker}:{self.args.dest_port}")
        self.dest.connect(self.args.dest_broker, self.args.dest_port, keepalive=60)
        self.dest.loop_start()

        print(f"[SOURCE] Connecting to {self.args.source_broker}:{self.args.source_port}")
        self.source.connect(self.args.source_broker, self.args.source_port, keepalive=60)
        self.source.loop_forever(retry_first_connection=True)


def build_parser(description, device, source_topic):
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--device", default=device)
    parser.add_argument("--source-broker", default=SOURCE_BROKER)
    parser.add_argument("--source-port", default=SOURCE_PORT, type=int)
    parser.add_argument("--source-topic", default=source_topic)
    parser.add_argument("--dest-broker", default=DEST_BROKER)
    parser.add_argument("--dest-port", default=DEST_PORT, type=int)
    parser.add_argument("--dest-topic", default=DEST_TOPIC)
    return parser


def run_bridge(description, device, source_topic):
    args = build_parser(description, device, source_topic).parse_args()
    print(f"[INFO] Bridge {args.device}: {args.source_broker}/{args.source_topic}")
    print(f"[INFO] Destination: {args.dest_broker}/{args.dest_topic}")

    try:
        DeviceBridge(args).run()
    except KeyboardInterrupt:
        print("\n[INFO] Arret.")
