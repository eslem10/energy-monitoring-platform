import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { StatusBar } from "expo-status-bar";

const DEFAULT_API_URL = "http://127.0.0.1:3000";
const DEVICE_COLORS = {
  frigo: "#2f80ed",
  machine_cafe: "#f59e0b",
  laptop: "#8b5cf6",
  microwave: "#ef4444",
  tv: "#22c55e",
  total: "#ef4444",
};

const DEVICE_LABELS = {
  frigo: "Frigo",
  machine_cafe: "Machine cafe",
  laptop: "Laptop",
  microwave: "Microwave",
  tv: "TV",
  total: "Total",
};

function normalizeApiUrl(url) {
  return url.trim().replace(/\/+$/, "");
}

function deviceLabel(device) {
  return DEVICE_LABELS[device] || device.replace(/_/g, " ");
}

function colorForDevice(device) {
  if (DEVICE_COLORS[device]) {
    return DEVICE_COLORS[device];
  }

  const palette = ["#2563eb", "#f97316", "#14b8a6", "#a855f7", "#e11d48", "#84cc16"];
  const index = Array.from(device).reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

function formatPower(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-- W";
  }

  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(2)} kW`;
  }

  return `${value.toFixed(1)} W`;
}

function statusColor(status) {
  if (status === "ON") return "#16a34a";
  if (status === "Refroidissement") return "#0284c7";
  if (status === "Inertie thermique") return "#f59e0b";
  return "#64748b";
}

function MiniChart({ points, color }) {
  const size = { width: 140, height: 54 };

  if (points.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.muted}>No history</Text>
      </View>
    );
  }

  const values = points.map((point) => point.power);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coordinates = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * size.width;
      const y = size.height - ((point.power - min) / range) * size.height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Svg width={size.width} height={size.height} style={styles.chart}>
      <Polyline points={coordinates} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Donut({ value, max }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value / max, 0), 1);

  return (
    <Svg width="96" height="96" viewBox="0 0 96 96">
      <Circle cx="48" cy="48" r={radius} stroke="#e2e8f0" strokeWidth="12" fill="none" />
      <Circle
        cx="48"
        cy="48"
        r={radius}
        stroke="#ef4444"
        strokeWidth="12"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round"
        rotation="-90"
        origin="48, 48"
      />
    </Svg>
  );
}

export default function App() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [backend, setBackend] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);

  async function loadData() {
    try {
      setError("");
      const baseUrl = normalizeApiUrl(apiUrl);
      const [healthResponse, summaryResponse, historyResponse] = await Promise.all([
        fetch(`${baseUrl}/api/health`),
        fetch(`${baseUrl}/api/summary`),
        fetch(`${baseUrl}/api/history?minutes=30`),
      ]);

      if (!healthResponse.ok || !summaryResponse.ok || !historyResponse.ok) {
        throw new Error("API unavailable");
      }

      setBackend(await healthResponse.json());
      setSummary(await summaryResponse.json());
      setHistory(await historyResponse.json());
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, [apiUrl]);

  const historyByDevice = useMemo(() => {
    return history.reduce((groups, point) => {
      groups[point.device] = groups[point.device] || [];
      groups[point.device].push(point);
      return groups;
    }, {});
  }, [history]);

  const devices = summary?.devices?.filter((item) => item.device !== "total") ?? [];
  const total = summary?.total ?? 0;
  const sumDevices = summary?.sumDevices ?? 0;
  const errorValue = summary?.error ?? 0;
  const deviceCount = backend?.devices?.filter((device) => device !== "total").length ?? devices.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Smart House</Text>
            <Text style={styles.subtitle}>Real-time energy monitoring</Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={loadData}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.apiCard}>
          <Text style={styles.label}>Node API URL</Text>
          <TextInput value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" style={styles.input} />
          <Text style={styles.hint}>For a real phone, use your PC IP address, for example http://192.168.x.x:3000</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" />
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Connection problem</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                Backend connected - {deviceCount} devices
                {lastUpdate ? ` - ${lastUpdate.toLocaleTimeString()}` : ""}
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.label}>Total measured</Text>
                <Text style={styles.bigValue}>{formatPower(total)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.label}>Sum of devices</Text>
                <Text style={styles.bigValue}>{formatPower(sumDevices)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.label}>Disaggregation error</Text>
                <Text style={styles.bigValue}>{formatPower(errorValue)}</Text>
              </View>
            </View>

            <View style={styles.totalCard}>
              <View>
                <Text style={styles.sectionTitle}>Total Load</Text>
                <Text style={styles.bigValue}>{formatPower(total)}</Text>
                <Text style={styles.muted}>Measured by STM32</Text>
              </View>
              <Donut value={total} max={2000} />
            </View>

            <Text style={styles.sectionTitle}>Devices</Text>
            {devices.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.errorTitle}>No devices yet</Text>
                <Text style={styles.muted}>Start Node.js and one MQTT bridge, then refresh.</Text>
              </View>
            ) : (
              <FlatList
                data={devices}
                keyExtractor={(item) => item.device}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={styles.deviceRow}
                renderItem={({ item }) => {
                  const color = colorForDevice(item.device);
                  return (
                    <View style={styles.deviceCard}>
                      <View style={styles.cardTop}>
                        <Text style={styles.deviceName}>{deviceLabel(item.device)}</Text>
                        <View style={[styles.statusPill, { backgroundColor: statusColor(item.status) }]}>
                          <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                      </View>
                      <Text style={[styles.powerValue, { color }]}>{formatPower(item.power)}</Text>
                      <MiniChart points={historyByDevice[item.device] || []} color={color} />
                    </View>
                  );
                }}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    padding: 18,
    gap: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 2,
  },
  refreshButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refreshText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  apiCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  label: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0f172a",
    marginTop: 8,
    padding: 10,
  },
  hint: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 8,
  },
  liveRow: {
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderColor: "#bbf7d0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  liveDot: {
    backgroundColor: "#16a34a",
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  liveText: {
    color: "#166534",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  errorCard: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 14,
  },
  errorTitle: {
    color: "#991b1b",
    fontSize: 16,
    fontWeight: "800",
  },
  errorText: {
    color: "#7f1d1d",
    marginTop: 4,
  },
  summaryGrid: {
    gap: 10,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  bigValue: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  totalCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
  },
  muted: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  deviceRow: {
    gap: 12,
  },
  deviceCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginBottom: 12,
    padding: 14,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  deviceName: {
    color: "#0f172a",
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  powerValue: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 12,
  },
  chart: {
    marginTop: 12,
  },
  chartEmpty: {
    alignItems: "center",
    height: 54,
    justifyContent: "center",
    marginTop: 12,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
});
