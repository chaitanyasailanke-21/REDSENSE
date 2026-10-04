import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/esp32_connectivity_service.dart';

class ConnectivityScreen extends StatelessWidget {
  const ConnectivityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final esp32 = context.watch<Esp32ConnectivityService>();

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'ESP32 & Sensor Connectivity',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
            ),
            FilledButton.tonalIcon(
              onPressed: esp32.isScanning ? null : () => esp32.scanForDevices(),
              icon: const Icon(Icons.radar, size: 18),
              label: Text(esp32.isScanning ? 'Scanning...' : 'Scan BLE & Wi-Fi'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ...esp32.discoveredDevices.map((device) {
          final bool isSelected = esp32.activeDevice?.id == device.id && esp32.isConnected;
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              leading: CircleAvatar(
                backgroundColor: const Color(0xFFE0F2FE),
                child: Icon(
                  device.protocol.name == 'ble' ? Icons.bluetooth : Icons.wifi,
                  color: const Color(0xFF0284C7),
                ),
              ),
              title: Text(device.name, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${device.address} · Firmware ${device.firmware} · RSSI ${device.rssi} dBm'),
              trailing: FilledButton(
                onPressed: () => isSelected ? esp32.disconnect() : esp32.connectToDevice(device),
                child: Text(isSelected ? 'Disconnect' : 'Connect'),
              ),
            ),
          );
        }),
      ],
    );
  }
}
