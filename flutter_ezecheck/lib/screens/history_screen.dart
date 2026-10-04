import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../services/firebase_sync_service.dart';
import '../services/export_service.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String _rangeFilter = 'Month'; // Day, Week, Month

  @override
  Widget build(BuildContext context) {
    final sync = context.watch<FirebaseSyncService>();
    final now = DateTime.now();
    final filtered = sync.readings.where((r) {
      final diff = now.difference(r.timestamp);
      if (_rangeFilter == 'Day') return diff.inHours <= 24;
      if (_rangeFilter == 'Week') return diff.inDays <= 7;
      return diff.inDays <= 30;
    }).toList();

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Session History & Clinical Export',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
              ),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: () => ExportService.exportToCsv(filtered),
                    icon: const Icon(Icons.table_view, size: 18),
                    label: const Text('Export CSV'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: () => ExportService.exportToPdfReport(filtered),
                    icon: const Icon(Icons.picture_as_pdf, size: 18),
                    label: const Text('Export PDF'),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'Day', label: Text('24 Hours')),
              ButtonSegment(value: 'Week', label: Text('Past 7 Days')),
              ButtonSegment(value: 'Month', label: Text('Past 30 Days')),
            ],
            selected: {_rangeFilter},
            onSelectionChanged: (s) => setState(() => _rangeFilter = s.first),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView.builder(
              itemCount: filtered.length,
              itemBuilder: (context, idx) {
                final item = filtered[idx];
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    title: Text(
                      '${item.heartRate.toStringAsFixed(0)} BPM  ·  ${item.spo2.toStringAsFixed(1)}% SpO2  ·  Hb ${item.hemoglobin.toStringAsFixed(1)} g/dL',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      '${DateFormat('MMM d, yyyy HH:mm').format(item.timestamp)} · ${item.deviceName} · ${item.notes}',
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
