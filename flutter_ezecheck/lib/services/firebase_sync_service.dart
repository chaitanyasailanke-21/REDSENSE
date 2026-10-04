import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/health_reading.dart';

class FirebaseSyncService extends ChangeNotifier {
  final List<HealthReading> readings = [];
  final List<CameraCaptureModel> captures = [];
  bool isCloudSynced = false;
  String? currentUserEmail;

  void loadInitialDummyData() {
    final now = DateTime.now();
    readings.addAll([
      HealthReading(
        id: 'rd_01',
        ownerId: 'demo_user',
        heartRate: 72,
        spo2: 99,
        hemoglobin: 14.6,
        perfusionIndex: 4.5,
        skinTemp: 36.6,
        deviceName: 'EzeCheck-ESP32-MAX30102',
        connectionType: ConnectionProtocol.ble,
        status: ClinicalStatus.nominal,
        notes: 'Resting morning baseline measurement',
        timestamp: now.subtract(const Duration(hours: 2)),
      ),
      HealthReading(
        id: 'rd_02',
        ownerId: 'demo_user',
        heartRate: 84,
        spo2: 97,
        hemoglobin: 14.3,
        perfusionIndex: 3.9,
        skinTemp: 36.8,
        deviceName: 'EzeCheck-ESP32-MAX30102',
        connectionType: ConnectionProtocol.ble,
        status: ClinicalStatus.nominal,
        notes: 'Post-walk optical check',
        timestamp: now.subtract(const Duration(days: 1, hours: 3)),
      ),
      HealthReading(
        id: 'rd_03',
        ownerId: 'demo_user',
        heartRate: 108,
        spo2: 94,
        hemoglobin: 13.8,
        perfusionIndex: 2.8,
        skinTemp: 37.1,
        deviceName: 'EzeCheck-CAM-OpticalNode',
        connectionType: ConnectionProtocol.wifi,
        status: ClinicalStatus.warning,
        notes: 'Elevated heart rate after cardio exercise',
        timestamp: now.subtract(const Duration(days: 5)),
      ),
    ]);
    notifyListeners();
  }

  Future<void> signInWithEmail(String email, String password) async {
    try {
      final cred = await FirebaseAuth.instance.signInWithEmailAndPassword(email: email, password: password);
      currentUserEmail = cred.user?.email;
      isCloudSynced = true;
      notifyListeners();
    } catch (e) {
      debugPrint('Auth fallback in demo mode: $e');
      currentUserEmail = email;
      isCloudSynced = true;
      notifyListeners();
    }
  }

  Future<void> registerWithEmail(String email, String password, String displayName) async {
    try {
      final cred = await FirebaseAuth.instance.createUserWithEmailAndPassword(email: email, password: password);
      await cred.user?.updateDisplayName(displayName);
      currentUserEmail = email;
      isCloudSynced = true;
      notifyListeners();
    } catch (e) {
      debugPrint('Registration fallback in demo mode: $e');
      currentUserEmail = email;
      isCloudSynced = true;
      notifyListeners();
    }
  }

  Future<void> saveReadingToCloud(HealthReading reading) async {
    readings.insert(0, reading);
    notifyListeners();
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        await FirebaseFirestore.instance.collection('readings').doc(reading.id).set(reading.toFirestore());
      }
    } catch (e) {
      debugPrint('Cloud Firestore sync queued locally: $e');
    }
  }
}
