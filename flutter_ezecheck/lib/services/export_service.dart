import 'dart:io';
import 'package:csv/csv.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import '../models/health_reading.dart';

class ExportService {
  static final DateFormat _fmt = DateFormat('yyyy-MM-dd HH:mm:ss');

  /// Exports health history readings as a CSV file and opens the native share sheet.
  static Future<String> exportToCsv(List<HealthReading> readings) async {
    final List<List<dynamic>> rows = [
      [
        'Reading ID',
        'Timestamp',
        'Heart Rate (BPM)',
        'SpO2 (%)',
        'Hemoglobin (g/dL)',
        'Perfusion Index (%)',
        'Skin Temp (C)',
        'Device Name',
        'Protocol',
        'Status',
        'Clinical Notes',
      ],
      ...readings.map((r) => [
            r.id,
            _fmt.format(r.timestamp),
            r.heartRate,
            r.spo2,
            r.hemoglobin,
            r.perfusionIndex,
            r.skinTemp,
            r.deviceName,
            r.connectionType.name.toUpperCase(),
            r.status.name.toUpperCase(),
            r.notes,
          ]),
    ];

    final String csvContent = const ListToCsvConverter().convert(rows);
    final Directory dir = await getTemporaryDirectory();
    final File file = File('${dir.path}/ezecheck_health_history.csv');
    await file.writeAsString(csvContent);
    await Share.shareXFiles([XFile(file.path)], text: 'EzeCheck Clinical Telemetry Export (CSV)');
    return file.path;
  }

  /// Generates a formatted clinical PDF report for doctors or personal records.
  static Future<void> exportToPdfReport(List<HealthReading> readings) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (context) => [
          pw.Header(
            level: 0,
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('EzeCheck Clinical Diagnostic Report',
                    style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
                pw.Text(_fmt.format(DateTime.now()), style: const pw.TextStyle(fontSize: 10)),
              ],
            ),
          ),
          pw.SizedBox(height: 12),
          pw.Text(
            'Hardware Source: ESP32 + MAX30102 Pulse Oximeter + ESP32-CAM Optical Sensor',
            style: const pw.TextStyle(fontSize: 11, color: PdfColors.blueGrey700),
          ),
          pw.SizedBox(height: 16),
          pw.TableHelper.fromTextArray(
            headers: ['Timestamp', 'HR (BPM)', 'SpO2 (%)', 'Hb (g/dL)', 'PI (%)', 'Temp (C)', 'Status'],
            data: readings
                .map((r) => [
                      _fmt.format(r.timestamp),
                      r.heartRate.toStringAsFixed(0),
                      '${r.spo2.toStringAsFixed(1)}%',
                      '${r.hemoglobin.toStringAsFixed(1)}',
                      '${r.perfusionIndex.toStringAsFixed(2)}%',
                      '${r.skinTemp.toStringAsFixed(1)}C',
                      r.status.name.toUpperCase(),
                    ])
                .toList(),
          ),
        ],
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }
}
