import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/esp32_connectivity_service.dart';

class CameraCaptureScreen extends StatefulWidget {
  const CameraCaptureScreen({super.key});

  @override
  State<CameraCaptureScreen> createState() => _CameraCaptureScreenState();
}

class _CameraCaptureScreenState extends State<CameraCaptureScreen> {
  String _selectedMode = 'Sclera Hemoglobin Scan';

  @override
  Widget build(BuildContext context) {
    final esp32 = context.watch<Esp32ConnectivityService>();

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
                    'ESP32-CAM Optical Capture',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                  ),
                  Text(
                    'Stream Endpoint: http://${esp32.esp32CamIp}:81/stream',
                    style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                  ),
                ],
              ),
              FilledButton.icon(
                onPressed: () async {
                  await esp32.captureEsp32CamStill();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Optical frame captured & synced to Cloud Storage')),
                    );
                  }
                },
                icon: const Icon(Icons.camera, size: 18),
                label: const Text('Capture Frame'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'Sclera Hemoglobin Scan', label: Text('Sclera Hb Scan')),
              ButtonSegment(value: 'Fingertip PPG Optical', label: Text('Fingertip PPG')),
              ButtonSegment(value: 'MAX30102 Sensor Alignment', label: Text('Sensor Align')),
            ],
            selected: {_selectedMode},
            onSelectionChanged: (s) => setState(() => _selectedMode = s.first),
          ),
          const SizedBox(height: 16),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Container(
              height: 320,
              width: double.infinity,
              color: const Color(0xFF0F172A),
              alignment: Alignment.center,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.videocam_outlined, color: Color(0xFF38BDF8), size: 48),
                  const SizedBox(height: 12),
                  Text(
                    'ESP32-CAM Live Stream ($_selectedMode)',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Est. Hb: ${esp32.currentHemoglobin.toStringAsFixed(1)} g/dL · SpO2: ${esp32.currentSpo2.toStringAsFixed(1)}%',
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
