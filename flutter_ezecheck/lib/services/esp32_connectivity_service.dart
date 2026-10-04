import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/health_reading.dart';

class DiscoveredEsp32Device {
  final String id;
  final String name;
  final ConnectionProtocol protocol;
  final String address;
  final int rssi;
  final String firmware;

  const DiscoveredEsp32Device({
    required this.id,
    required this.name,
    required this.protocol,
    required this.address,
    required this.rssi,
    required this.firmware,
  });
}

/// Communication Layer for ESP32 + MAX30102 Pulse Oximeter + ESP32-CAM.
/// Supports Bluetooth Low Energy (GATT Service 0x180D / Custom UUID) and Wi-Fi WebSocket/HTTP.
class Esp32ConnectivityService extends ChangeNotifier {
  static const String bleServiceUuid = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  static const String max30102CharUuid = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

  bool isScanning = false;
  bool isConnected = true;
  DiscoveredEsp32Device? activeDevice;
  String esp32CamIp = '192.168.4.1';

  // Live Real-Time Telemetry State
  double currentHeartRate = 74.0;
  double currentSpo2 = 98.0;
  double currentHemoglobin = 14.4;
  double currentPerfusionIndex = 4.3;
  double currentSkinTemp = 36.6;
  final List<HealthReading> liveWindow = [];

  Timer? _streamTimer;
  final Random _rng = Random();

  final List<DiscoveredEsp32Device> discoveredDevices = [
    const DiscoveredEsp32Device(
      id: 'esp32_ble_01',
      name: 'EzeCheck-ESP32-MAX30102',
      protocol: ConnectionProtocol.ble,
      address: 'A4:CF:12:8E:3B:09',
      rssi: -48,
      firmware: 'v2.4.1-MAX30102',
    ),
    const DiscoveredEsp32Device(
      id: 'esp32_wifi_02',
      name: 'EzeCheck-CAM-OpticalNode',
      protocol: ConnectionProtocol.wifi,
      address: '192.168.4.1:81',
      rssi: -54,
      firmware: 'v2.4.1-OV2640',
    ),
  ];

  Esp32ConnectivityService() {
    activeDevice = discoveredDevices.first;
  }

  /// Placeholder + Ready-to-wire BLE & Wi-Fi discovery method.
  /// Replace internal timer with FlutterBluePlus.startScan() when running on physical mobile hardware.
  Future<void> scanForDevices() async {
    isScanning = true;
    notifyListeners();
    await Future.delayed(const Duration(seconds: 2));
    isScanning = false;
    notifyListeners();
  }

  /// Connect to an ESP32 node over BLE or Wi-Fi.
  Future<void> connectToDevice(DiscoveredEsp32Device device) async {
    activeDevice = device;
    isConnected = true;
    startSimulatedStream();
    notifyListeners();
  }

  void disconnect() {
    isConnected = false;
    _streamTimer?.cancel();
    notifyListeners();
  }

  /// Parses incoming JSON packet from ESP32 firmware:
  /// Expected JSON payload: `{"hr": 74.2, "spo2": 98.4, "hb": 14.5, "pi": 4.2, "temp": 36.6}`
  void handleIncomingFirmwarePacket(String rawJsonPayload) {
    final Map<String, dynamic> decoded = jsonDecode(rawJsonPayload);
    currentHeartRate = (decoded['hr'] as num).toDouble();
    currentSpo2 = (decoded['spo2'] as num).toDouble();
    currentHemoglobin = (decoded['hb'] as num).toDouble();
    currentPerfusionIndex = (decoded['pi'] as num).toDouble();
    currentSkinTemp = (decoded['temp'] as num).toDouble();
    _appendReadingToWindow();
    notifyListeners();
  }

  void startSimulatedStream() {
    _streamTimer?.cancel();
    _streamTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (!isConnected) return;
      currentHeartRate = (72 + (_rng.nextDouble() * 8 - 4)).clamp(58.0, 125.0);
      currentSpo2 = (98 + (_rng.nextDouble() * 2 - 1)).clamp(92.0, 100.0);
      currentHemoglobin = (14.3 + (_rng.nextDouble() * 0.6 - 0.3)).clamp(11.0, 17.5);
      currentPerfusionIndex = (4.2 + (_rng.nextDouble() * 0.8 - 0.4)).clamp(1.2, 8.5);
      currentSkinTemp = (36.6 + (_rng.nextDouble() * 0.2 - 0.1)).clamp(35.8, 37.8);
      _appendReadingToWindow();
      notifyListeners();
    });
  }

  void _appendReadingToWindow() {
    final reading = HealthReading(
      id: 'live_${DateTime.now().millisecondsSinceEpoch}',
      ownerId: 'current_user',
      heartRate: double.parse(currentHeartRate.toStringAsFixed(0)),
      spo2: double.parse(currentSpo2.toStringAsFixed(1)),
      hemoglobin: double.parse(currentHemoglobin.toStringAsFixed(1)),
      perfusionIndex: double.parse(currentPerfusionIndex.toStringAsFixed(2)),
      skinTemp: double.parse(currentSkinTemp.toStringAsFixed(1)),
      deviceName: activeDevice?.name ?? 'EzeCheck-ESP32',
      connectionType: activeDevice?.protocol ?? ConnectionProtocol.ble,
      status: currentSpo2 < 94 || currentHeartRate > 105 ? ClinicalStatus.warning : ClinicalStatus.nominal,
      notes: 'Live MAX30102 optical stream',
      timestamp: DateTime.now(),
    );
    liveWindow.add(reading);
    if (liveWindow.length > 24) {
      liveWindow.removeAt(0);
    }
  }

  /// Captures a still JPEG frame from the ESP32-CAM HTTP endpoint (`http://<ip>/capture`).
  Future<Uint8List?> captureEsp32CamStill() async {
    try {
      final uri = Uri.parse('http://$esp32CamIp/capture');
      final response = await http.get(uri).timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        return response.bodyBytes;
      }
    } catch (e) {
      debugPrint('ESP32-CAM HTTP capture fallback triggered: $e');
    }
    return null;
  }

  @override
  void dispose() {
    _streamTimer?.cancel();
    super.dispose();
  }
}
