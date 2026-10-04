import 'package:cloud_firestore/cloud_firestore.dart';

enum ConnectionProtocol { ble, wifi }

enum ClinicalStatus { nominal, warning, critical }

class HealthReading {
  final String id;
  final String ownerId;
  final double heartRate;
  final double spo2;
  final double hemoglobin;
  final double perfusionIndex;
  final double skinTemp;
  final String deviceName;
  final ConnectionProtocol connectionType;
  final ClinicalStatus status;
  final String notes;
  final DateTime timestamp;

  const HealthReading({
    required this.id,
    required this.ownerId,
    required this.heartRate,
    required this.spo2,
    required this.hemoglobin,
    required this.perfusionIndex,
    required this.skinTemp,
    required this.deviceName,
    required this.connectionType,
    required this.status,
    required this.notes,
    required this.timestamp,
  });

  Map<String, dynamic> toFirestore() {
    return {
      'ownerId': ownerId,
      'heartRate': heartRate,
      'spo2': spo2,
      'hemoglobin': hemoglobin,
      'perfusionIndex': perfusionIndex,
      'skinTemp': skinTemp,
      'deviceName': deviceName,
      'connectionType': connectionType == ConnectionProtocol.ble ? 'BLE' : 'WiFi',
      'status': status.name,
      'notes': notes,
      'recordedAtMs': timestamp.millisecondsSinceEpoch,
      'createdAt': FieldValue.serverTimestamp(),
    };
  }

  factory HealthReading.fromFirestore(String id, Map<String, dynamic> data) {
    return HealthReading(
      id: id,
      ownerId: data['ownerId'] ?? '',
      heartRate: (data['heartRate'] as num?)?.toDouble() ?? 72.0,
      spo2: (data['spo2'] as num?)?.toDouble() ?? 98.0,
      hemoglobin: (data['hemoglobin'] as num?)?.toDouble() ?? 14.2,
      perfusionIndex: (data['perfusionIndex'] as num?)?.toDouble() ?? 4.0,
      skinTemp: (data['skinTemp'] as num?)?.toDouble() ?? 36.6,
      deviceName: data['deviceName'] ?? 'EzeCheck-ESP32',
      connectionType: data['connectionType'] == 'WiFi' ? ConnectionProtocol.wifi : ConnectionProtocol.ble,
      status: ClinicalStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => ClinicalStatus.nominal,
      ),
      notes: data['notes'] ?? '',
      timestamp: DateTime.fromMillisecondsSinceEpoch(
        (data['recordedAtMs'] as num?)?.toInt() ?? DateTime.now().millisecondsSinceEpoch,
      ),
    );
  }
}

class CameraCaptureModel {
  final String id;
  final String ownerId;
  final String title;
  final String captureMode;
  final String resolution;
  final double estimatedHb;
  final double spo2AtCapture;
  final double heartRateAtCapture;
  final String imageUrl;
  final DateTime timestamp;

  const CameraCaptureModel({
    required this.id,
    required this.ownerId,
    required this.title,
    required this.captureMode,
    required this.resolution,
    required this.estimatedHb,
    required this.spo2AtCapture,
    required this.heartRateAtCapture,
    required this.imageUrl,
    required this.timestamp,
  });
}
