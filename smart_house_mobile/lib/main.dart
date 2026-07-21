import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const SmartHouseApp());
}

class SmartHouseApp extends StatefulWidget {
  const SmartHouseApp({super.key});

  @override
  State<SmartHouseApp> createState() => _SmartHouseAppState();
}

class _SmartHouseAppState extends State<SmartHouseApp> {
  bool darkMode = false;

  void toggleTheme() {
    setState(() => darkMode = !darkMode);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Energy Dashboard',
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      themeMode: darkMode ? ThemeMode.dark : ThemeMode.light,
      home: AuthGate(darkMode: darkMode, onThemeToggle: toggleTheme),
    );
  }
}

ThemeData buildTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  return ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xff0a7d55),
      brightness: brightness,
    ),
    useMaterial3: true,
    scaffoldBackgroundColor: isDark
        ? const Color(0xff0f1720)
        : const Color(0xfff4f8f6),
    fontFamily: 'Arial',
    appBarTheme: AppBarTheme(
      backgroundColor: isDark
          ? const Color(0xff111827)
          : const Color(0xfff4f8f6),
      foregroundColor: isDark ? Colors.white : const Color(0xff10221a),
      elevation: 0,
      centerTitle: false,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: isDark ? const Color(0xff1f2937) : Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(
          color: isDark ? const Color(0xff374151) : const Color(0xffdbe5df),
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(
          color: isDark ? const Color(0xff374151) : const Color(0xffdbe5df),
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xff0a7d55), width: 1.6),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: const Color(0xff0a7d55),
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: isDark ? const Color(0xff111827) : Colors.white,
      indicatorColor: isDark
          ? const Color(0xff1f4d3b)
          : const Color(0xffd9f5e8),
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
      ),
    ),
  );
}

class AuthGate extends StatefulWidget {
  const AuthGate({
    super.key,
    required this.darkMode,
    required this.onThemeToggle,
  });

  final bool darkMode;
  final VoidCallback onThemeToggle;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool loggedIn = false;
  String userName = 'Admin';

  @override
  Widget build(BuildContext context) {
    if (!loggedIn) {
      return AuthPage(
        onLogin: (name) {
          setState(() {
            loggedIn = true;
            userName = name;
          });
        },
      );
    }

    return DashboardShell(
      userName: userName,
      onLogout: () => setState(() => loggedIn = false),
      darkMode: widget.darkMode,
      onThemeToggle: widget.onThemeToggle,
    );
  }
}

class AuthPage extends StatefulWidget {
  const AuthPage({super.key, required this.onLogin});

  final ValueChanged<String> onLogin;

  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  final nameController = TextEditingController(text: 'Admin');
  final emailController = TextEditingController(text: 'admin@smart.house');
  final passwordController = TextEditingController(text: '123456');
  bool registerMode = false;
  String? error;

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  void submit() {
    final email = emailController.text.trim();
    final password = passwordController.text.trim();
    final name = nameController.text.trim().isEmpty
        ? 'Admin'
        : nameController.text.trim();

    if (!email.contains('@') || password.length < 4) {
      setState(() => error = 'Check email and password.');
      return;
    }

    widget.onLogin(name);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(
                      Icons.home_work_rounded,
                      size: 56,
                      color: Color(0xff087b54),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      registerMode ? 'Create Account' : 'Welcome Back',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (registerMode)
                      TextField(
                        controller: nameController,
                        decoration: const InputDecoration(
                          labelText: 'Name',
                          prefixIcon: Icon(Icons.person),
                        ),
                      ),
                    if (registerMode) const SizedBox(height: 12),
                    TextField(
                      controller: emailController,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.email),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Password',
                        prefixIcon: Icon(Icons.lock),
                      ),
                    ),
                    if (error != null) ...[
                      const SizedBox(height: 12),
                      Text(error!, style: const TextStyle(color: Colors.red)),
                    ],
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: submit,
                      child: Text(registerMode ? 'Register' : 'Login'),
                    ),
                    TextButton(
                      onPressed: () =>
                          setState(() => registerMode = !registerMode),
                      child: Text(
                        registerMode
                            ? 'I already have an account'
                            : 'Create new account',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class DashboardShell extends StatefulWidget {
  const DashboardShell({
    super.key,
    required this.userName,
    required this.onLogout,
    required this.darkMode,
    required this.onThemeToggle,
  });

  final String userName;
  final VoidCallback onLogout;
  final bool darkMode;
  final VoidCallback onThemeToggle;

  @override
  State<DashboardShell> createState() => _DashboardShellState();
}

class _DashboardShellState extends State<DashboardShell> {
  int selectedIndex = 0;
  String apiUrl = 'http://127.0.0.1:3001';
  SummaryData? summary;
  List<DeviceReading> history = [];
  List<DeviceEnergy> energy = [];
  List<AppAlert> alerts = [];
  List<ManagedDevice> adminDevices = [];
  Map<String, bool> deviceControlStates = {};
  Set<String> favoriteDevices = <String>{};
  List<Map<String, dynamic>> customScenes = [];
  String? error;
  Timer? refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadCustomScenes().catchError((_) {});
    refreshAll().catchError((_) {});
    refreshTimer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => refreshAll(silent: true),
    );
  }

  @override
  void dispose() {
    refreshTimer?.cancel();
    super.dispose();
  }

  Uri endpoint(String path) => Uri.parse('$apiUrl$path');

  Future<dynamic> getJson(String path) async {
    final response = await http.get(endpoint(path));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('${response.statusCode}: ${response.body}');
    }
    return jsonDecode(response.body);
  }

  Future<void> refreshAll({bool silent = false}) async {
    try {
      final results = await Future.wait([
        getJson('/api/summary'),
        getJson('/api/history?minutes=60'),
        getJson('/api/energy?minutes=60'),
        getJson('/api/alerts?minutes=60'),
        getJson('/api/admin/devices'),
      ]);

      if (!mounted) return;
      setState(() {
        summary = SummaryData.fromJson(results[0] as Map<String, dynamic>);
        history = (results[1] as List)
            .map((item) => DeviceReading.fromJson(item))
            .toList();
        energy = (results[2] as List)
            .map((item) => DeviceEnergy.fromJson(item))
            .toList();
        alerts = (results[3] as List)
            .map((item) => AppAlert.fromJson(item))
            .toList();
        adminDevices = (results[4] as List)
            .map((item) => ManagedDevice.fromJson(item))
            .toList();
        error = null;

        final nextStates = Map<String, bool>.from(deviceControlStates);
        for (final device in summary?.devices ?? const <DevicePower>[]) {
          if (!nextStates.containsKey(device.device)) {
            nextStates[device.device] =
                device.status != 'OFF' && device.power > 5;
          }
        }
        deviceControlStates = nextStates;

        if (favoriteDevices.isEmpty) {
          final seededFavorites = <String>{};
          for (final device in summary?.devices ?? const <DevicePower>[]) {
            if ([
              'frigo',
              'cafe',
              'tv',
              'laptop',
              'micro',
            ].contains(device.device)) {
              seededFavorites.add(device.device);
              if (seededFavorites.length == 2) break;
            }
          }
          favoriteDevices = seededFavorites;
        }
      });
    } catch (err) {
      if (!silent && mounted) {
        setState(() => error = err.toString());
      }
    }
  }

  Future<void> addDevice(String name, String label) async {
    final response = await http.post(
      endpoint('/api/admin/devices'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name, 'label': label}),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(response.body);
    }
    await refreshAll();
  }

  Future<void> deleteDevice(String name) async {
    final response = await http.delete(endpoint('/api/admin/devices/$name'));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(response.body);
    }
    await refreshAll();
  }

  Future<void> toggleDevice(String deviceName, bool value) async {
    final previous = deviceControlStates[deviceName];
    setState(() => deviceControlStates[deviceName] = value);

    try {
      final response = await http.post(
        endpoint('/api/devices/${Uri.encodeComponent(deviceName)}/control'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'action': value ? 'on' : 'off'}),
      );
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(response.body);
      }
      await refreshAll(silent: true);
    } catch (err) {
      if (mounted) {
        setState(() => deviceControlStates[deviceName] = previous ?? value);
      }
    }
  }

  Future<void> toggleAllDevices(bool value) async {
    final devices = (summary?.devices ?? const <DevicePower>[])
        .where((device) => device.device != 'total')
        .toList();

    setState(() {
      for (final device in devices) {
        deviceControlStates[device.device] = value;
      }
    });

    try {
      await Future.wait(
        devices.map(
          (device) => http.post(
            endpoint(
              '/api/devices/${Uri.encodeComponent(device.device)}/control',
            ),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'action': value ? 'on' : 'off'}),
          ),
        ),
      );
      await refreshAll(silent: true);
    } catch (err) {
      if (mounted) {
        setState(() {
          for (final device in devices) {
            deviceControlStates[device.device] =
                deviceControlStates[device.device] ?? value;
          }
        });
      }
    }
  }

  Future<void> applyHomeMode(String mode) async {
    final devices = (summary?.devices ?? const <DevicePower>[])
        .where((device) => device.device != 'total')
        .toList();

    final targetStates = <String, bool>{};
    switch (mode) {
      case 'Evening':
        for (final device in devices) {
          targetStates[device.device] =
              favoriteDevices.contains(device.device) ||
              device.device == 'cafe' ||
              device.device == 'tv';
        }
        break;
      case 'Night':
        for (final device in devices) {
          targetStates[device.device] = device.device == 'frigo';
        }
        break;
      case 'Party':
        for (final device in devices) {
          targetStates[device.device] = true;
        }
        break;
      case 'Away':
        for (final device in devices) {
          targetStates[device.device] = false;
        }
        break;
      default:
        break;
    }

    setState(() {
      for (final entry in targetStates.entries) {
        deviceControlStates[entry.key] = entry.value;
      }
    });

    try {
      await Future.wait(
        targetStates.entries.map(
          (entry) => http.post(
            endpoint('/api/devices/${Uri.encodeComponent(entry.key)}/control'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'action': entry.value ? 'on' : 'off'}),
          ),
        ),
      );
      await refreshAll(silent: true);
    } catch (err) {
      if (mounted) {
        setState(() {
          for (final entry in targetStates.entries) {
            deviceControlStates[entry.key] =
                deviceControlStates[entry.key] ?? entry.value;
          }
        });
      }
    }
  }

  void toggleFavorite(String deviceName) {
    setState(() {
      if (favoriteDevices.contains(deviceName)) {
        favoriteDevices.remove(deviceName);
      } else {
        favoriteDevices.add(deviceName);
      }
    });
  }

  Future<void> _loadCustomScenes() async {
    if (!mounted) return;
    setState(() => customScenes = []);
  }

  Future<void> _persistCustomScenes() async {
    return;
  }

  Future<void> saveCustomScene(String name) async {
    final devices = (summary?.devices ?? const <DevicePower>[])
        .where((device) => device.device != 'total')
        .toList();

    final scene = <String, dynamic>{
      'name': name.trim().isEmpty ? 'My scene' : name.trim(),
      'devices': devices
          .map(
            (device) => {
              'name': device.device,
              'value':
                  deviceControlStates[device.device] ??
                  (device.status != 'OFF' && device.power > 5),
            },
          )
          .toList(),
    };

    final nextScenes = [
      ...customScenes.where((item) => item['name'] != scene['name']),
      scene,
    ];

    setState(() => customScenes = nextScenes);
    await _persistCustomScenes();
  }

  Future<void> applyCustomScene(Map<String, dynamic> scene) async {
    final devices = scene['devices'] as List<dynamic>? ?? const [];
    final targetStates = <String, bool>{};

    for (final device in devices) {
      final payload = device as Map<String, dynamic>;
      targetStates['${payload['name']}'] = payload['value'] == true;
    }

    setState(() {
      for (final entry in targetStates.entries) {
        deviceControlStates[entry.key] = entry.value;
      }
    });

    try {
      await Future.wait(
        targetStates.entries.map(
          (entry) => http.post(
            endpoint('/api/devices/${Uri.encodeComponent(entry.key)}/control'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'action': entry.value ? 'on' : 'off'}),
          ),
        ),
      );
      await refreshAll(silent: true);
    } catch (err) {
      if (mounted) {
        setState(() {
          for (final entry in targetStates.entries) {
            deviceControlStates[entry.key] =
                deviceControlStates[entry.key] ?? entry.value;
          }
        });
      }
    }
  }

  Future<void> deleteCustomScene(String name) async {
    setState(() {
      customScenes = customScenes
          .where((item) => item['name'] != name)
          .toList();
    });
    await _persistCustomScenes();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardPage(
        summary: summary,
        history: history,
        energy: energy,
        alerts: alerts,
        error: error,
        controlStates: deviceControlStates,
        onRefresh: refreshAll,
        onOpenNotifications: () => setState(() => selectedIndex = 4),
        onToggleDevice: toggleDevice,
        onToggleAllDevices: toggleAllDevices,
        onApplyHomeMode: applyHomeMode,
        favoriteDevices: favoriteDevices,
        onToggleFavorite: toggleFavorite,
        customScenes: customScenes,
        onSaveCustomScene: saveCustomScene,
        onApplyCustomScene: applyCustomScene,
        onDeleteCustomScene: deleteCustomScene,
      ),
      DevicesPage(
        devices: summary?.devices ?? const [],
        history: history,
        energy: energy,
      ),
      HistoryPage(history: history, energy: energy, summary: summary),
      ChatbotPage(
        summary: summary,
        history: history,
        energy: energy,
        alerts: alerts,
      ),
      NotificationsPage(alerts: alerts, onRefresh: refreshAll),
      MorePage(
        summary: summary,
        history: history,
        energy: energy,
        alerts: alerts,
        adminDevices: adminDevices,
        onAddDevice: addDevice,
        onDeleteDevice: deleteDevice,
        onRefresh: refreshAll,
        onLogout: widget.onLogout,
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Energy Dashboard',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        leading: const Icon(Icons.home_rounded),
        actions: [
          IconButton(
            tooltip: 'Theme',
            onPressed: widget.onThemeToggle,
            icon: Icon(
              widget.darkMode
                  ? Icons.dark_mode_rounded
                  : Icons.light_mode_rounded,
            ),
          ),
          IconButton(
            tooltip: 'Notifications',
            onPressed: () => setState(() => selectedIndex = 4),
            icon: Badge(
              isLabelVisible: alerts.isNotEmpty,
              label: Text('${alerts.length}'),
              child: const Icon(Icons.notifications_none_rounded),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Builder(
        builder: (context) {
          try {
            return pages[selectedIndex];
          } catch (e) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline_rounded,
                    size: 48,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 16),
                  Text('Error: $e', textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => setState(() {}),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }
        },
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) => setState(() => selectedIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_rounded),
            label: 'Dash',
          ),
          NavigationDestination(
            icon: Icon(Icons.devices_other_rounded),
            label: 'Devices',
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_rounded),
            label: 'History',
          ),
          NavigationDestination(
            icon: Icon(Icons.smart_toy_rounded),
            label: 'Assistant',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_rounded),
            label: 'Alerts',
          ),
          NavigationDestination(
            icon: Icon(Icons.more_horiz_rounded),
            label: 'More',
          ),
        ],
      ),
    );
  }
}

class DashboardPage extends StatelessWidget {
  const DashboardPage({
    super.key,
    required this.summary,
    required this.history,
    required this.energy,
    required this.alerts,
    required this.error,
    required this.controlStates,
    required this.onRefresh,
    required this.onOpenNotifications,
    required this.onToggleDevice,
    required this.onToggleAllDevices,
    required this.onApplyHomeMode,
    required this.favoriteDevices,
    required this.onToggleFavorite,
    required this.customScenes,
    required this.onSaveCustomScene,
    required this.onApplyCustomScene,
    required this.onDeleteCustomScene,
  });

  final SummaryData? summary;
  final List<DeviceReading> history;
  final List<DeviceEnergy> energy;
  final List<AppAlert> alerts;
  final String? error;
  final Map<String, bool> controlStates;
  final Future<void> Function({bool silent}) onRefresh;
  final VoidCallback onOpenNotifications;
  final Future<void> Function(String deviceName, bool value) onToggleDevice;
  final Future<void> Function(bool value) onToggleAllDevices;
  final Future<void> Function(String mode) onApplyHomeMode;
  final Set<String> favoriteDevices;
  final ValueChanged<String> onToggleFavorite;
  final List<Map<String, dynamic>> customScenes;
  final Future<void> Function(String name) onSaveCustomScene;
  final Future<void> Function(Map<String, dynamic> scene) onApplyCustomScene;
  final Future<void> Function(String name) onDeleteCustomScene;

  @override
  Widget build(BuildContext context) {
    final devices =
        summary?.devices.where((device) => device.device != 'total').toList() ??
        [];
    final total = summary?.total ?? summary?.sumDevices ?? 0;
    final estimatedHour = energy.fold<double>(0, (sum, item) => sum + item.energyWh);

    return RefreshIndicator(
      onRefresh: () => onRefresh(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) ErrorCard(message: error!),
          HeroStatusCard(
            totalPower: total,
            deviceCount: devices.length,
            alertCount: alerts.length,
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: MediaQuery.of(context).size.width > 720 ? 3 : 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.25,
            children: [
              MetricCard(
                title: 'Total current power',
                value: formatPower(total),
                icon: Icons.bolt_rounded,
                color: const Color(0xff0a7d55),
              ),
              MetricCard(
                title: 'Devices',
                value: '${devices.length}',
                icon: Icons.sensors_rounded,
                color: const Color(0xff2f80ed),
              ),
              MetricCard(
                title: 'Energy last hour',
                value: '${estimatedHour.toStringAsFixed(2)} Wh',
                icon: Icons.electric_meter_rounded,
                color: const Color(0xffffb020),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SectionHeader(title: 'Live devices', action: 'View all'),
          const SizedBox(height: 8),
          if (devices.isEmpty)
            const EmptyCard(text: 'No live devices yet. Start MQTT and backend, then send a measurement.')
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: devices.length,
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 210,
                childAspectRatio: 1.35,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
              ),
              itemBuilder: (context, index) {
                final device = devices[index];
                return DeviceCard(
                  reading: device,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => DeviceDetailsPage(
                        reading: device,
                        history: history
                            .where((point) => point.device == device.device)
                            .toList(),
                        energy: energy.firstWhere(
                          (item) => item.device == device.device,
                          orElse: () =>
                              DeviceEnergy(device: device.device, energyWh: 0),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          const SizedBox(height: 16),
          SectionHeader(title: 'Power over time'),
          const SizedBox(height: 8),
          ChartCard(history: history),
          const SizedBox(height: 16),
          SectionHeader(title: 'Recent alerts', action: 'Open'),
          const SizedBox(height: 8),
          if (alerts.isEmpty)
            const EmptyCard(text: 'No active alerts')
          else
            ...alerts
                .take(3)
                .map(
                  (alert) =>
                      AlertTile(alert: alert, onTap: onOpenNotifications),
                ),
        ],
      ),
    );
  }
}

class DevicesPage extends StatelessWidget {
  const DevicesPage({
    super.key,
    required this.devices,
    required this.history,
    required this.energy,
  });

  final List<DevicePower> devices;
  final List<DeviceReading> history;
  final List<DeviceEnergy> energy;

  @override
  Widget build(BuildContext context) {
    final filtered = devices
        .where((device) => device.device != 'total')
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(title: 'Devices'),
        const SizedBox(height: 8),
        ...filtered.map(
          (device) => ListTileCard(
            icon: iconForDevice(device.device),
            title: prettyDevice(device.device),
            subtitle: '${device.status} - ${formatPower(device.power)}',
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => DeviceDetailsPage(
                  reading: device,
                  history: history
                      .where((point) => point.device == device.device)
                      .toList(),
                  energy: energy.firstWhere(
                    (item) => item.device == device.device,
                    orElse: () =>
                        DeviceEnergy(device: device.device, energyWh: 0),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class DeviceDetailsPage extends StatelessWidget {
  const DeviceDetailsPage({
    super.key,
    required this.reading,
    required this.history,
    required this.energy,
  });

  final DevicePower reading;
  final List<DeviceReading> history;
  final DeviceEnergy energy;

  @override
  Widget build(BuildContext context) {
    final maxPower = history.isEmpty
        ? reading.power
        : history
              .map((item) => item.power)
              .reduce((a, b) => math.max(a, b).toDouble());
    final avgPower = history.isEmpty
        ? reading.power
        : history.map((item) => item.power).reduce((a, b) => a + b) /
              history.length;

    return Scaffold(
      appBar: AppBar(title: Text(prettyDevice(reading.device))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          DeviceHero(reading: reading),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: MetricCard(
                  title: 'Energy last hour',
                  value: '${energy.energyWh.toStringAsFixed(2)} Wh',
                  icon: Icons.energy_savings_leaf,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: MetricCard(
                  title: 'Average',
                  value: formatPower(avgPower),
                  icon: Icons.speed_rounded,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          MetricCard(
            title: 'Peak last hour',
            value: formatPower(maxPower),
            icon: Icons.trending_up_rounded,
          ),
          const SizedBox(height: 16),
          const SectionHeader(title: 'History'),
          const SizedBox(height: 8),
          ChartCard(history: history),
          const SizedBox(height: 16),
          AdviceCard(reading: reading),
        ],
      ),
    );
  }
}

class HistoryPage extends StatelessWidget {
  const HistoryPage({
    super.key,
    required this.history,
    required this.energy,
    required this.summary,
  });

  final List<DeviceReading> history;
  final List<DeviceEnergy> energy;
  final SummaryData? summary;

  @override
  Widget build(BuildContext context) {
    final totalEnergy = energy.fold<double>(
      0,
      (sum, item) => sum + item.energyWh,
    );
    final sortedEnergy = [...energy]
      ..sort((a, b) => b.energyWh.compareTo(a.energyWh));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        MetricCard(
          title: 'Estimated energy last hour',
          value: '${totalEnergy.toStringAsFixed(2)} Wh',
          icon: Icons.electric_meter_rounded,
        ),
        const SizedBox(height: 16),
        const SectionHeader(title: 'Consumption by device'),
        const SizedBox(height: 8),
        if (sortedEnergy.isEmpty)
          const EmptyCard(text: 'No energy data yet')
        else
          ...sortedEnergy.map((item) {
            final ratio = totalEnergy <= 0 ? 0.0 : item.energyWh / totalEnergy;
            return EnergyRow(item: item, ratio: ratio);
          }),
        const SizedBox(height: 16),
        const SectionHeader(title: 'Latest measurements'),
        const SizedBox(height: 8),
        ...history.reversed
            .take(8)
            .map(
              (point) => ListTileCard(
                icon: iconForDevice(point.device),
                title: prettyDevice(point.device),
                subtitle: timeOnly(point.time),
                trailing: Text(
                  formatPower(point.power),
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ),
      ],
    );
  }
}

class ChatbotPage extends StatefulWidget {
  const ChatbotPage({
    super.key,
    required this.summary,
    required this.history,
    required this.energy,
    required this.alerts,
  });

  final SummaryData? summary;
  final List<DeviceReading> history;
  final List<DeviceEnergy> energy;
  final List<AppAlert> alerts;

  @override
  State<ChatbotPage> createState() => _ChatbotPageState();
}

class _ChatbotPageState extends State<ChatbotPage> {
  final inputController = TextEditingController();
  final scrollController = ScrollController();
  late List<ChatMessage> messages;

  @override
  void initState() {
    super.initState();
    messages = [
      ChatMessage(
        text:
            'Hi, I can explain your smart house energy data. Ask me about total power, alerts, fridge state, top consumer, or energy last hour.',
        fromUser: false,
        time: DateTime.now(),
      ),
    ];
  }

  @override
  void dispose() {
    inputController.dispose();
    scrollController.dispose();
    super.dispose();
  }

  void ask(String question) {
    final text = question.trim();
    if (text.isEmpty) return;

    setState(() {
      messages.add(ChatMessage(text: text, fromUser: true, time: DateTime.now()));
      messages.add(ChatMessage(text: buildAnswer(text), fromUser: false, time: DateTime.now()));
    });
    inputController.clear();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!scrollController.hasClients) return;
      scrollController.animateTo(
        scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  String buildAnswer(String question) {
    final q = question.toLowerCase();
    final devices = (widget.summary?.devices ?? const <DevicePower>[])
        .where((device) => device.device != 'total')
        .toList();
    final total = widget.summary?.total ?? widget.summary?.sumDevices ?? 0;
    final totalEnergy = widget.energy.fold<double>(0, (sum, item) => sum + item.energyWh);
    final topPower = devices.isEmpty
        ? null
        : devices.reduce((a, b) => a.power >= b.power ? a : b);
    final topEnergy = widget.energy.isEmpty
        ? null
        : widget.energy.reduce((a, b) => a.energyWh >= b.energyWh ? a : b);
    final fridge = devices.where((device) => device.device.contains('frigo')).toList();

    if (q.contains('alert') || q.contains('alarm') || q.contains('notification')) {
      if (widget.alerts.isEmpty) {
        return 'No active alerts right now. Everything looks normal.';
      }
      final first = widget.alerts.first;
      return 'There are ${widget.alerts.length} active alerts. The most important one is ${first.title} on ${prettyDevice(first.device)}: ${first.reason}';
    }

    if (q.contains('total') || q.contains('sum') || q.contains('power')) {
      return 'The current total power is ${formatPower(total)}. It is calculated from the latest live measurements.';
    }

    if (q.contains('energy') || q.contains('consumption') || q.contains('last hour')) {
      final top = topEnergy == null
          ? 'No top device yet.'
          : '${prettyDevice(topEnergy.device)} consumed the most with ${topEnergy.energyWh.toStringAsFixed(2)} Wh.';
      return 'Estimated energy during the last hour is ${totalEnergy.toStringAsFixed(2)} Wh. $top';
    }

    if (q.contains('highest') || q.contains('top') || q.contains('more') || q.contains('akther')) {
      if (topPower == null) return 'No device data yet.';
      return '${prettyDevice(topPower.device)} is currently consuming the most: ${formatPower(topPower.power)}.';
    }

    if (q.contains('frigo') || q.contains('fridge') || q.contains('cool')) {
      if (fridge.isEmpty) return 'I do not see fridge data yet.';
      final item = fridge.first;
      return 'Fridge state is ${item.status}. If it says Refroidissement, the compressor is cooling. If it says Inertie thermique, temperature is being maintained.';
    }

    if (q.contains('off') || q.contains('on') || q.contains('status')) {
      if (devices.isEmpty) return 'No device status available yet.';
      return devices
          .map((device) => '${prettyDevice(device.device)}: ${device.status}')
          .join('\n');
    }

    return 'I can help with: total power, highest consumer, alerts, fridge state, device status, and estimated energy last hour.';
  }

  @override
  Widget build(BuildContext context) {
    final quickQuestions = [
      'Total power?',
      'Any alerts?',
      'Top consumer?',
      'Fridge state?',
      'Energy last hour?',
    ];

    return Column(
      children: [
        Expanded(
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(16),
            children: [
              const SectionHeader(title: 'Energy Assistant'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: quickQuestions
                    .map(
                      (item) => ActionChip(
                        label: Text(item),
                        avatar: const Icon(Icons.bolt_rounded, size: 18),
                        onPressed: () => ask(item),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 16),
              ...messages.map((message) => ChatBubble(message: message)),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: inputController,
                    decoration: const InputDecoration(
                      hintText: 'Ask about your energy data...',
                      prefixIcon: Icon(Icons.chat_bubble_outline_rounded),
                    ),
                    onSubmitted: ask,
                  ),
                ),
                const SizedBox(width: 10),
                IconButton.filled(
                  onPressed: () => ask(inputController.text),
                  icon: const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class ChatBubble extends StatelessWidget {
  const ChatBubble({super.key, required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final color = message.fromUser ? const Color(0xff0a7d55) : Colors.white;
    final textColor = message.fromUser ? Colors.white : Theme.of(context).colorScheme.onSurface;

    return Align(
      alignment: message.fromUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 360),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(18),
          border: message.fromUser ? null : Border.all(color: const Color(0xffdbe5df)),
          boxShadow: const [
            BoxShadow(color: Color(0x0d000000), blurRadius: 12, offset: Offset(0, 6)),
          ],
        ),
        child: Text(
          message.text,
          style: TextStyle(color: textColor, fontWeight: FontWeight.w600, height: 1.35),
        ),
      ),
    );
  }
}

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({
    super.key,
    required this.alerts,
    required this.onRefresh,
  });

  final List<AppAlert> alerts;
  final Future<void> Function({bool silent}) onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () => onRefresh(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SectionHeader(title: 'Notifications'),
          const SizedBox(height: 8),
          if (alerts.isEmpty)
            const EmptyCard(text: 'No notifications now')
          else
            ...alerts.map(
              (alert) => AlertTile(
                alert: alert,
                onTap: () => showModalBottomSheet(
                  context: context,
                  showDragHandle: true,
                  builder: (_) => AlertDetails(alert: alert),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class MorePage extends StatelessWidget {
  const MorePage({
    super.key,
    required this.summary,
    required this.history,
    required this.energy,
    required this.alerts,
    required this.adminDevices,
    required this.onAddDevice,
    required this.onDeleteDevice,
    required this.onRefresh,
    required this.onLogout,
  });

  final SummaryData? summary;
  final List<DeviceReading> history;
  final List<DeviceEnergy> energy;
  final List<AppAlert> alerts;
  final List<ManagedDevice> adminDevices;
  final Future<void> Function(String name, String label) onAddDevice;
  final Future<void> Function(String name) onDeleteDevice;
  final Future<void> Function({bool silent}) onRefresh;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final items = [
      _MoreItem(
        title: 'Cost Estimation',
        subtitle: 'kWh and estimated electricity cost',
        icon: Icons.payments_rounded,
        page: CostPage(energy: energy),
      ),
      _MoreItem(
        title: 'Reports',
        subtitle: 'Daily summary for your internship report',
        icon: Icons.description_rounded,
        page: ReportsPage(summary: summary, energy: energy, alerts: alerts),
      ),
      _MoreItem(
        title: 'Rooms',
        subtitle: 'Kitchen, living room, office consumption',
        icon: Icons.meeting_room_rounded,
        page: RoomsPage(summary: summary, energy: energy),
      ),
      _MoreItem(
        title: 'Recommendations',
        subtitle: 'Smart advice from current measurements',
        icon: Icons.tips_and_updates_rounded,
        page: RecommendationsPage(summary: summary, energy: energy, alerts: alerts),
      ),
      _MoreItem(
        title: 'Profile',
        subtitle: 'Application and project information',
        icon: Icons.person_rounded,
        page: const ProfilePage(),
      ),
      _MoreItem(
        title: 'Admin Settings',
        subtitle: 'Add or remove devices automatically',
        icon: Icons.admin_panel_settings_rounded,
        page: SettingsPage(
          devices: adminDevices,
          onAddDevice: onAddDevice,
          onDeleteDevice: onDeleteDevice,
          onRefresh: onRefresh,
          onLogout: onLogout,
        ),
      ),
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(title: 'More Tools'),
        const SizedBox(height: 8),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: items.length,
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 260,
            childAspectRatio: 1.25,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
          ),
          itemBuilder: (context, index) {
            final item = items[index];
            return MoreToolCard(
              item: item,
              color: toolColor(index),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => item.page),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _MoreItem {
  _MoreItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.page,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Widget page;
}

class MoreToolCard extends StatelessWidget {
  const MoreToolCard({
    super.key,
    required this.item,
    required this.color,
    required this.onTap,
  });

  final _MoreItem item;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [const Color(0xff111827), color.withValues(alpha: 0.18)]
                : [Colors.white, color.withValues(alpha: 0.16)],
          ),
          border: Border.all(color: color.withValues(alpha: 0.22)),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.12), blurRadius: 18, offset: const Offset(0, 9))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(item.icon, color: color),
            ),
            const Spacer(),
            Text(item.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            const SizedBox(height: 4),
            Text(
              item.subtitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.62), fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

class CostPage extends StatefulWidget {
  const CostPage({super.key, required this.energy});

  final List<DeviceEnergy> energy;

  @override
  State<CostPage> createState() => _CostPageState();
}

class _CostPageState extends State<CostPage> {
  final tariffController = TextEditingController(text: '0.250');

  @override
  void dispose() {
    tariffController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tariff = numberOrNull(tariffController.text) ?? 0.250;
    final totalWh = widget.energy.fold<double>(0, (sum, item) => sum + item.energyWh);
    final totalKwh = totalWh / 1000;
    final cost = totalKwh * tariff;
    final sorted = [...widget.energy]..sort((a, b) => b.energyWh.compareTo(a.energyWh));

    return Scaffold(
      appBar: AppBar(title: const Text('Cost Estimation')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: tariffController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Electricity tariff (TND/kWh)',
              prefixIcon: Icon(Icons.payments_rounded),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 16),
          MetricCard(
            title: 'Estimated cost last hour',
            value: '${cost.toStringAsFixed(3)} TND',
            icon: Icons.receipt_long_rounded,
          ),
          const SizedBox(height: 16),
          const SectionHeader(title: 'Cost by device'),
          const SizedBox(height: 8),
          if (sorted.isEmpty)
            const EmptyCard(text: 'No energy data yet')
          else
            ...sorted.map((item) {
              final itemCost = (item.energyWh / 1000) * tariff;
              return ListTileCard(
                icon: iconForDevice(item.device),
                title: prettyDevice(item.device),
                subtitle: '${item.energyWh.toStringAsFixed(2)} Wh',
                trailing: Text('${itemCost.toStringAsFixed(3)} TND', style: const TextStyle(fontWeight: FontWeight.w900)),
              );
            }),
        ],
      ),
    );
  }
}

class ReportsPage extends StatelessWidget {
  const ReportsPage({
    super.key,
    required this.summary,
    required this.energy,
    required this.alerts,
  });

  final SummaryData? summary;
  final List<DeviceEnergy> energy;
  final List<AppAlert> alerts;

  @override
  Widget build(BuildContext context) {
    final devices = (summary?.devices ?? const <DevicePower>[])
        .where((device) => device.device != 'total')
        .toList();
    final totalPower = summary?.total ?? summary?.sumDevices ?? 0;
    final totalEnergy = energy.fold<double>(0, (sum, item) => sum + item.energyWh);
    final topEnergy = energy.isEmpty
        ? null
        : energy.reduce((a, b) => a.energyWh >= b.energyWh ? a : b);

    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          MetricCard(title: 'Current total power', value: formatPower(totalPower), icon: Icons.bolt_rounded),
          const SizedBox(height: 12),
          MetricCard(title: 'Energy last hour', value: '${totalEnergy.toStringAsFixed(2)} Wh', icon: Icons.electric_meter_rounded),
          const SizedBox(height: 12),
          MetricCard(title: 'Alerts count', value: '${alerts.length}', icon: Icons.notifications_active_rounded),
          const SizedBox(height: 16),
          CardBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Report summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                const SizedBox(height: 10),
                Text('Detected devices: ${devices.length}'),
                Text('Top consumer: ${topEnergy == null ? 'No data' : prettyDevice(topEnergy.device)}'),
                Text('System state: ${alerts.isEmpty ? 'Normal' : 'Needs attention'}'),
                const SizedBox(height: 10),
                const Text(
                  'This page is useful for the report: it summarizes live acquisition, disaggregation, energy estimation and alerts.',
                  style: TextStyle(color: Colors.black54, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class RoomsPage extends StatelessWidget {
  const RoomsPage({super.key, required this.summary, required this.energy});

  final SummaryData? summary;
  final List<DeviceEnergy> energy;

  String roomFor(String device) {
    if (device.contains('frigo') || device.contains('cafe') || device.contains('micro')) return 'Kitchen';
    if (device.contains('tv')) return 'Living Room';
    if (device.contains('laptop')) return 'Office';
    return 'Other';
  }

  @override
  Widget build(BuildContext context) {
    final devices = (summary?.devices ?? const <DevicePower>[])
        .where((device) => device.device != 'total')
        .toList();
    final powerByRoom = <String, double>{};
    final energyByRoom = <String, double>{};

    for (final device in devices) {
      final room = roomFor(device.device);
      powerByRoom[room] = (powerByRoom[room] ?? 0) + device.power;
    }

    for (final item in energy) {
      final room = roomFor(item.device);
      energyByRoom[room] = (energyByRoom[room] ?? 0) + item.energyWh;
    }

    final rooms = {...powerByRoom.keys, ...energyByRoom.keys}.toList()..sort();

    return Scaffold(
      appBar: AppBar(title: const Text('Rooms')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (rooms.isEmpty)
            const EmptyCard(text: 'No room data yet')
          else
            ...rooms.map((room) => CardBox(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(room, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 8),
                      Text('Current power: ${formatPower(powerByRoom[room] ?? 0)}'),
                      Text('Energy last hour: ${(energyByRoom[room] ?? 0).toStringAsFixed(2)} Wh'),
                    ],
                  ),
                )),
        ],
      ),
    );
  }
}

class RecommendationsPage extends StatelessWidget {
  const RecommendationsPage({
    super.key,
    required this.summary,
    required this.energy,
    required this.alerts,
  });

  final SummaryData? summary;
  final List<DeviceEnergy> energy;
  final List<AppAlert> alerts;

  @override
  Widget build(BuildContext context) {
    final devices = (summary?.devices ?? const <DevicePower>[])
        .where((device) => device.device != 'total')
        .toList();
    final recommendations = <String>[];
    final topPower = devices.isEmpty ? null : devices.reduce((a, b) => a.power >= b.power ? a : b);
    final fridge = devices.where((device) => device.device.contains('frigo')).toList();

    if (alerts.isNotEmpty) {
      recommendations.add('Check alerts first: ${alerts.first.reason}');
    }
    if (topPower != null && topPower.power > 500) {
      recommendations.add('${prettyDevice(topPower.device)} is currently the highest consumer (${formatPower(topPower.power)}).');
    }
    if (fridge.isNotEmpty) {
      recommendations.add('Fridge state is ${fridge.first.status}; cycling between cooling and thermal inertia is normal.');
    }
    if (energy.isEmpty) {
      recommendations.add('Start the data collectors to build energy recommendations.');
    }
    if (recommendations.isEmpty) {
      recommendations.add('Consumption looks stable right now. Keep monitoring for longer sessions.');
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Recommendations')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ...recommendations.map(
            (text) => ListTileCard(
              icon: Icons.tips_and_updates_rounded,
              title: 'Smart advice',
              subtitle: text,
            ),
          ),
        ],
      ),
    );
  }
}

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          CardBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.home_work_rounded, color: Color(0xff087b54), size: 42),
                SizedBox(height: 12),
                Text('Smart House Monitoring', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                SizedBox(height: 8),
                Text('Mobile dashboard for real-time monitoring, alerts, energy reports and device management.'),
              ],
            ),
          ),
          SizedBox(height: 12),
          ListTileCard(
            icon: Icons.sync_rounded,
            title: 'Refresh interval',
            subtitle: 'Live data updates every 5 seconds.',
          ),
          ListTileCard(
            icon: Icons.storage_rounded,
            title: 'Data pipeline',
            subtitle: 'STM32 / MQTT / Node.js / InfluxDB / Mobile dashboard.',
          ),
          ListTileCard(
            icon: Icons.school_rounded,
            title: 'Internship scope',
            subtitle: 'Real-time visualization and electrical load disaggregation.',
          ),
        ],
      ),
    );
  }
}

class SettingsPage extends StatefulWidget {
  const SettingsPage({
    super.key,
    required this.devices,
    required this.onAddDevice,
    required this.onDeleteDevice,
    required this.onRefresh,
    required this.onLogout,
  });

  final List<ManagedDevice> devices;
  final Future<void> Function(String name, String label) onAddDevice;
  final Future<void> Function(String name) onDeleteDevice;
  final Future<void> Function({bool silent}) onRefresh;
  final VoidCallback onLogout;

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  final deviceController = TextEditingController();
  final labelController = TextEditingController();
  bool saving = false;
  String? message;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    deviceController.dispose();
    labelController.dispose();
    super.dispose();
  }

  Future<void> addDevice() async {
    final name = deviceController.text.trim();
    final label = labelController.text.trim();
    if (name.isEmpty) {
      setState(() => message = 'Write device name first.');
      return;
    }

    setState(() {
      saving = true;
      message = null;
    });

    try {
      await widget.onAddDevice(name, label.isEmpty ? name : label);
      deviceController.clear();
      labelController.clear();
      setState(
        () => message =
            'Device added. It will appear automatically when measurements arrive.',
      );
    } catch (err) {
      setState(() => message = err.toString());
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(title: 'Device Setup'),
        const SizedBox(height: 8),
        CardBox(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Manage appliances',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
              ),
              const SizedBox(height: 6),
              const Text(
                'Add a new appliance once. After that, its live measurements will be detected automatically.',
              ),
              const SizedBox(height: 12),
              TextField(
                controller: deviceController,
                decoration: const InputDecoration(
                  labelText: 'Device key, example: heater',
                  prefixIcon: Icon(Icons.memory_rounded),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: labelController,
                decoration: const InputDecoration(
                  labelText: 'Display name, example: Heater',
                  prefixIcon: Icon(Icons.badge_rounded),
                ),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: saving ? null : addDevice,
                icon: const Icon(Icons.add_rounded),
                label: Text(saving ? 'Saving...' : 'Add device'),
              ),
              if (message != null) ...[
                const SizedBox(height: 10),
                Text(
                  message!,
                  style: const TextStyle(color: Color(0xff087b54)),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        const SectionHeader(title: 'Registered devices'),
        const SizedBox(height: 8),
        if (widget.devices.isEmpty)
          const EmptyCard(text: 'No devices registered')
        else
          ...widget.devices.map(
            (device) => ListTileCard(
              icon: iconForDevice(device.name),
              title: device.label,
              subtitle: device.autoDiscovered
                  ? 'Detected automatically'
                  : 'Ready for live measurements',
              trailing: IconButton(
                tooltip: 'Delete',
                onPressed: device.autoDiscovered
                    ? null
                    : () async {
                        await widget.onDeleteDevice(device.name);
                        if (mounted) {
                          setState(
                            () => message =
                                '${device.name} deleted from registry.',
                          );
                        }
                      },
                icon: const Icon(Icons.delete_outline_rounded),
              ),
            ),
          ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: () => widget.onRefresh(),
          icon: const Icon(Icons.refresh_rounded),
          label: const Text('Refresh data'),
        ),
        TextButton.icon(
          onPressed: widget.onLogout,
          icon: const Icon(Icons.logout_rounded),
          label: const Text('Logout'),
        ),
      ],
    );
  }
}

class HeroStatusCard extends StatelessWidget {
  const HeroStatusCard({
    super.key,
    required this.totalPower,
    required this.deviceCount,
    required this.alertCount,
  });

  final double totalPower;
  final int deviceCount;
  final int alertCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xff087b54), Color(0xff18c98a), Color(0xff2f80ed)],
        ),
        boxShadow: const [
          BoxShadow(color: Color(0x3318c98a), blurRadius: 26, offset: Offset(0, 14)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(Icons.home_work_rounded, color: Colors.white),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    const Text('LIVE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          const Text('Smart House Overview', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text(formatPower(totalPower), style: const TextStyle(color: Colors.white, fontSize: 46, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _HeroChip(label: '$deviceCount devices'),
              _HeroChip(label: '$alertCount alerts'),
              const _HeroChip(label: 'Auto refresh'),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
    );
  }
}

class MetricCard extends StatelessWidget {
  const MetricCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    this.color = const Color(0xff087b54),
  });

  final String title;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withValues(alpha: isDark ? 0.22 : 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.62),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: color),
            ),
          ),
        ],
      ),
    );
  }
}

class DeviceCard extends StatelessWidget {
  const DeviceCard({super.key, required this.reading, required this.onTap});

  final DevicePower reading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final active = reading.status != 'OFF' && reading.power > 5;
    final color = colorForDevice(reading.device);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [const Color(0xff111827), color.withValues(alpha: 0.18)]
                : [Colors.white, color.withValues(alpha: 0.12)],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.22)),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.12), blurRadius: 18, offset: const Offset(0, 8))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(iconForDevice(reading.device), color: color),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: active
                        ? const Color(0xffe6f8ef)
                        : const Color(0xfff1f3f5),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    reading.status,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: active ? const Color(0xff087b54) : Colors.black54,
                    ),
                  ),
                ),
              ],
            ),
            const Spacer(),
            Text(
              prettyDevice(reading.device),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              formatPower(reading.power),
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class DeviceHero extends StatelessWidget {
  const DeviceHero({super.key, required this.reading});

  final DevicePower reading;

  @override
  Widget build(BuildContext context) {
    final color = colorForDevice(reading.device);
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(iconForDevice(reading.device), size: 42, color: Colors.white),
          const SizedBox(height: 28),
          Text(
            prettyDevice(reading.device),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            formatPower(reading.power),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 48,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(
            reading.status,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class ChartCard extends StatelessWidget {
  const ChartCard({super.key, required this.history});

  final List<DeviceReading> history;

  @override
  Widget build(BuildContext context) {
    return CardBox(
      child: SizedBox(
        height: 220,
        child: history.isEmpty
            ? const Center(child: Text('No chart data'))
            : CustomPaint(
                painter: PowerChartPainter(history),
                child: const SizedBox.expand(),
              ),
      ),
    );
  }
}

class PowerChartPainter extends CustomPainter {
  PowerChartPainter(this.points);

  final List<DeviceReading> points;

  @override
  void paint(Canvas canvas, Size size) {
    final axisPaint = Paint()
      ..color = const Color(0xffd7dee8)
      ..strokeWidth = 1;
    final textPainter = TextPainter(textDirection: TextDirection.ltr);
    final padding = const EdgeInsets.fromLTRB(36, 12, 10, 28);
    final chart = Rect.fromLTWH(
      padding.left,
      padding.top,
      size.width - padding.left - padding.right,
      size.height - padding.top - padding.bottom,
    );
    final maxPower = math
        .max(
          10,
          points
              .map((item) => item.power)
              .reduce((a, b) => math.max(a, b).toDouble()),
        )
        .toDouble();
    final minTime = points
        .map((item) => item.time.millisecondsSinceEpoch)
        .reduce((a, b) => math.min(a, b).toInt());
    final maxTime = points
        .map((item) => item.time.millisecondsSinceEpoch)
        .reduce((a, b) => math.max(a, b).toInt());
    final span = math.max(1, maxTime - minTime);

    for (var i = 0; i <= 4; i++) {
      final y = chart.top + chart.height * i / 4;
      canvas.drawLine(Offset(chart.left, y), Offset(chart.right, y), axisPaint);
      textPainter.text = TextSpan(
        text: '${(maxPower * (1 - i / 4)).round()}',
        style: const TextStyle(fontSize: 10, color: Colors.black45),
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(0, y - 7));
    }

    final groups = <String, List<DeviceReading>>{};
    for (final point in points) {
      groups.putIfAbsent(point.device, () => []).add(point);
    }

    groups.forEach((device, devicePoints) {
      devicePoints.sort((a, b) => a.time.compareTo(b.time));
      final path = Path();
      for (var i = 0; i < devicePoints.length; i++) {
        final point = devicePoints[i];
        final x =
            chart.left +
            chart.width * (point.time.millisecondsSinceEpoch - minTime) / span;
        final y = chart.bottom - chart.height * (point.power / maxPower);
        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      canvas.drawPath(
        path,
        Paint()
          ..color = colorForDevice(device)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5
          ..strokeCap = StrokeCap.round,
      );
    });
  }

  @override
  bool shouldRepaint(covariant PowerChartPainter oldDelegate) =>
      oldDelegate.points != points;
}

class EnergyRow extends StatelessWidget {
  const EnergyRow({super.key, required this.item, required this.ratio});

  final DeviceEnergy item;
  final double ratio;

  @override
  Widget build(BuildContext context) {
    final color = colorForDevice(item.device);
    return CardBox(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(iconForDevice(item.device), color: color),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  prettyDevice(item.device),
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
              Text(
                '${item.energyWh.toStringAsFixed(2)} Wh',
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: ratio.clamp(0, 1).toDouble(),
              minHeight: 10,
              color: color,
              backgroundColor: color.withValues(alpha: 0.14),
            ),
          ),
        ],
      ),
    );
  }
}

class AlertTile extends StatelessWidget {
  const AlertTile({super.key, required this.alert, required this.onTap});

  final AppAlert alert;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = alert.level == 'critical'
        ? Colors.red
        : alert.level == 'warning'
        ? Colors.orange
        : const Color(0xff087b54);
    return ListTileCard(
      icon: alert.level == 'info'
          ? Icons.info_outline_rounded
          : Icons.warning_amber_rounded,
      iconColor: color,
      title: alert.title,
      subtitle: '${prettyDevice(alert.device)} - ${alert.reason}',
      trailing: Text(
        timeOnly(alert.time),
        style: const TextStyle(fontWeight: FontWeight.w700),
      ),
      onTap: onTap,
    );
  }
}

class AlertDetails extends StatelessWidget {
  const AlertDetails({super.key, required this.alert});

  final AppAlert alert;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            alert.title,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text(
            prettyDevice(alert.device),
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(alert.reason),
          const SizedBox(height: 12),
          Text('Power: ${formatPower(alert.power)}'),
          Text('Time: ${alert.time}'),
        ],
      ),
    );
  }
}

class AdviceCard extends StatelessWidget {
  const AdviceCard({super.key, required this.reading});

  final DevicePower reading;

  @override
  Widget build(BuildContext context) {
    final text = reading.device == 'frigo'
        ? 'Fridge cycles are normal. Refroidissement means the compressor is cooling, Inertie thermique means temperature is stable.'
        : reading.power > 5
        ? 'Device is active. If it stays active too long, an alert will appear in Notifications.'
        : 'Device is currently off or nearly idle.';
    return CardBox(
      child: Row(
        children: [
          const Icon(Icons.tips_and_updates_rounded, color: Color(0xff087b54)),
          const SizedBox(width: 12),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

class ListTileCard extends StatelessWidget {
  const ListTileCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.trailing,
    this.onTap,
    this.iconColor,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    return CardBox(
      margin: const EdgeInsets.only(bottom: 10),
      padding: EdgeInsets.zero,
      child: ListTile(
        leading: Icon(icon, color: iconColor ?? const Color(0xff087b54)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis),
        trailing: trailing,
        onTap: onTap,
      ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  const _ModeChip({
    required this.label,
    required this.icon,
    required this.mode,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final String mode;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => onTap(mode),
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xffeaf7f1),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: const Color(0xffbfe4d1)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: const Color(0xff087b54)),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}

class _SceneCreator extends StatefulWidget {
  const _SceneCreator({required this.onSave});

  final Future<void> Function(String name) onSave;

  @override
  State<_SceneCreator> createState() => _SceneCreatorState();
}

class _SceneCreatorState extends State<_SceneCreator> {
  final controller = TextEditingController();

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CardBox(
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Scene name',
                prefixIcon: Icon(Icons.tune_rounded),
              ),
            ),
          ),
          const SizedBox(width: 12),
          FilledButton(
            onPressed: () async {
              final name = controller.text.trim();
              if (name.isEmpty) return;
              await widget.onSave(name);
              controller.clear();
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}

class CardBox extends StatelessWidget {
  const CardBox({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xff111827) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? const Color(0xff263244) : const Color(0xffdbe5f1)),
        boxShadow: [
          BoxShadow(
            color: isDark ? const Color(0x33000000) : const Color(0x0d000000),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.action});

  final String title;
  final String? action;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
        ),
        if (action != null)
          Text(
            action!,
            style: const TextStyle(
              color: Color(0xff087b54),
              fontWeight: FontWeight.w800,
            ),
          ),
      ],
    );
  }
}

class EmptyCard extends StatelessWidget {
  const EmptyCard({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return CardBox(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            text,
            style: const TextStyle(
              color: Colors.black54,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class ErrorCard extends StatelessWidget {
  const ErrorCard({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: CardBox(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.error_outline_rounded, color: Colors.red),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Connection problem',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Live data is temporarily unavailable. Check that the local service is running.',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ChatMessage {
  ChatMessage({required this.text, required this.fromUser, required this.time});

  final String text;
  final bool fromUser;
  final DateTime time;
}

class SummaryData {
  SummaryData({
    required this.total,
    required this.sumDevices,
    required this.devices,
  });

  final double? total;
  final double sumDevices;
  final List<DevicePower> devices;

  factory SummaryData.fromJson(Map<String, dynamic> json) {
    return SummaryData(
      total: numberOrNull(json['total']),
      sumDevices: numberOrNull(json['sumDevices']) ?? 0,
      devices: ((json['devices'] as List?) ?? [])
          .map((item) => DevicePower.fromJson(item))
          .toList(),
    );
  }
}

class DevicePower {
  DevicePower({
    required this.device,
    required this.power,
    required this.status,
    required this.time,
  });

  final String device;
  final double power;
  final String status;
  final DateTime time;

  factory DevicePower.fromJson(dynamic json) {
    return DevicePower(
      device: '${json['device'] ?? 'unknown'}',
      power: numberOrNull(json['power']) ?? 0,
      status: '${json['status'] ?? 'OFF'}',
      time: parseTime(json['time']),
    );
  }
}

class DeviceReading {
  DeviceReading({
    required this.device,
    required this.power,
    required this.time,
  });

  final String device;
  final double power;
  final DateTime time;

  factory DeviceReading.fromJson(dynamic json) {
    return DeviceReading(
      device: '${json['device'] ?? 'unknown'}',
      power: numberOrNull(json['power']) ?? 0,
      time: parseTime(json['time']),
    );
  }
}

class DeviceEnergy {
  DeviceEnergy({required this.device, required this.energyWh});

  final String device;
  final double energyWh;

  factory DeviceEnergy.fromJson(dynamic json) {
    return DeviceEnergy(
      device: '${json['device'] ?? 'unknown'}',
      energyWh: numberOrNull(json['energyWh']) ?? 0,
    );
  }
}

class AppAlert {
  AppAlert({
    required this.title,
    required this.device,
    required this.reason,
    required this.power,
    required this.time,
    required this.level,
  });

  final String title;
  final String device;
  final String reason;
  final double power;
  final DateTime time;
  final String level;

  factory AppAlert.fromJson(dynamic json) {
    return AppAlert(
      title: '${json['title'] ?? 'Alert'}',
      device: '${json['device'] ?? 'unknown'}',
      reason: '${json['reason'] ?? ''}',
      power: numberOrNull(json['power']) ?? 0,
      time: parseTime(json['time']),
      level: '${json['level'] ?? 'info'}',
    );
  }
}

class ManagedDevice {
  ManagedDevice({
    required this.name,
    required this.label,
    required this.topic,
    required this.autoDiscovered,
  });

  final String name;
  final String label;
  final String topic;
  final bool autoDiscovered;

  factory ManagedDevice.fromJson(dynamic json) {
    final name = '${json['name'] ?? 'unknown'}';
    return ManagedDevice(
      name: name,
      label: '${json['label'] ?? prettyDevice(name)}',
      topic: '${json['topic'] ?? 'maison/$name'}',
      autoDiscovered: json['autoDiscovered'] == true,
    );
  }
}

double? numberOrNull(dynamic value) {
  final number = num.tryParse('$value');
  return number?.toDouble();
}

DateTime parseTime(dynamic value) {
  return DateTime.tryParse('$value')?.toLocal() ?? DateTime.now();
}

String timeOnly(DateTime time) {
  final hour = time.hour.toString().padLeft(2, '0');
  final minute = time.minute.toString().padLeft(2, '0');
  final second = time.second.toString().padLeft(2, '0');
  return '$hour:$minute:$second';
}

String formatPower(double value) {
  if (value.abs() >= 1000) {
    return '${(value / 1000).toStringAsFixed(2)} kW';
  }
  return '${value.toStringAsFixed(value < 10 && value != value.roundToDouble() ? 1 : 0)} W';
}

String prettyDevice(String device) {
  return device
      .split('_')
      .map(
        (part) => part.isEmpty
            ? part
            : '${part[0].toUpperCase()}${part.substring(1)}',
      )
      .join(' ');
}

IconData iconForDevice(String device) {
  if (device.contains('frigo')) return Icons.kitchen_rounded;
  if (device.contains('cafe')) return Icons.coffee_maker_rounded;
  if (device.contains('micro')) return Icons.microwave_rounded;
  if (device.contains('tv')) return Icons.tv_rounded;
  if (device.contains('laptop')) return Icons.laptop_mac_rounded;
  if (device.contains('total')) return Icons.bolt_rounded;
  return Icons.memory_rounded;
}

Color colorForDevice(String device) {
  if (device.contains('frigo')) return const Color(0xff2f80ed);
  if (device.contains('cafe')) return const Color(0xffffb020);
  if (device.contains('micro')) return const Color(0xffff4d5e);
  if (device.contains('tv')) return const Color(0xff20bf6b);
  if (device.contains('laptop')) return const Color(0xff7b61ff);
  return const Color(0xff087b54);
}
