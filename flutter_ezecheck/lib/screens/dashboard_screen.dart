import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/health_reading.dart';
import '../services/esp32_connectivity_service.dart';
import '../services/firebase_sync_service.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final esp32 = context.watch<Esp32ConnectivityService>();
    final sync = context.watch<FirebaseSyncService>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Patient Telemetry Overview',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    esp32.isConnected
                        ? 'Streaming live from ${esp32.activeDevice?.name ?? "ESP32"}'
                        : 'Hardware node disconnected',
                    style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                  ),
                ],
              ),
              FilledButton.icon(
                onPressed: () {
                  final reading = HealthReading(
                    id: 'rec_${DateTime.now().millisecondsSinceEpoch}',
                    ownerId: 'current_user',
                    heartRate: esp32.currentHeartRate.roundToDouble(),
                    spo2: double.parse(esp32.currentSpo2.toStringAsFixed(1)),
                    hemoglobin: double.parse(esp32.currentHemoglobin.toStringAsFixed(1)),
                    perfusionIndex: double.parse(esp32.currentPerfusionIndex.toStringAsFixed(2)),
                    skinTemp: double.parse(esp32.currentSkinTemp.toStringAsFixed(1)),
                    deviceName: esp32.activeDevice?.name ?? 'EzeCheck-ESP32',
                    connectionType: esp32.activeDevice?.protocol ?? ConnectionProtocol.ble,
                    status: ClinicalStatus.nominal,
                    notes: 'Saved from Live Dashboard',
                    timestamp: DateTime.now(),
                  );
                  sync.saveReadingToCloud(reading);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Reading saved & synced to Cloud Firestore')),
                  );
                },
                icon: const Icon(Icons.cloud_upload_outlined, size: 18),
                label: const Text('Record Snapshot'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, constraints) {
              final int columns = constraints.maxWidth >= 900 ? 4 : (constraints.maxWidth >= 520 ? 2 : 1);
              return GridView.count(
                crossAxisCount: columns,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.55,
                children: [
                  _VitalCard(
                    title: 'Heart Rate',
                    value: esp32.currentHeartRate.toStringAsFixed(0),
                    unit: 'BPM',
                    subtitle: 'MAX30102 Red/IR PPG',
                    icon: Icons.favorite_rounded,
                    accentColor: const Color(0xFF0284C7),
                  ),
                  _VitalCard(
                    title: 'Oxygen Saturation',
                    value: esp32.currentSpo2.toStringAsFixed(1),
                    unit: '% SpO2',
                    subtitle: 'Arterial Oxygenation',
                    icon: Icons.water_drop_rounded,
                    accentColor: const Color(0xFF0D9488),
                  ),
                  _VitalCard(
                    title: 'Non-Invasive Hb',
                    value: esp32.currentHemoglobin.toStringAsFixed(1),
                    unit: 'g/dL',
                    subtitle: 'EzeCheck Optical Est.',
                    icon: Icons.biotech_rounded,
                    accentColor: const Color(0xFF2563EB),
                  ),
                  _VitalCard(
                    title: 'Perfusion & Temp',
                    value: '${esp32.currentPerfusionIndex.toStringAsFixed(1)}%',
                    unit: '${esp32.currentSkinTemp.toStringAsFixed(1)} °C',
                    subtitle: 'Peripheral Pulse Strength',
                    icon: Icons.thermostat_rounded,
                    accentColor: const Color(0xFF059669),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _VitalCard extends StatelessWidget {
  final String title;
  final String value;
  final String unit;
  final String subtitle;
  final IconData icon;
  final Color accentColor;

  const _VitalCard({
    required this.title,
    required this.value,
    required this.unit,
    required this.subtitle,
    required this.icon,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                Icon(icon, color: accentColor, size: 22),
              ],
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value,
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                ),
                const SizedBox(width: 6),
                Text(unit, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
              ],
            ),
            Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
          ],
        ),
      ),
    );
  }
}
