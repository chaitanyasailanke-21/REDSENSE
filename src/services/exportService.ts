import { jsPDF } from 'jspdf';
import { HealthReading, CameraCapture } from '../types/health';

export function exportReadingsToCsv(readings: HealthReading[]): void {
  const headers = [
    'Reading ID',
    'Recorded Timestamp (ISO)',
    'Heart Rate (BPM)',
    'SpO2 (%)',
    'Estimated Hemoglobin (g/dL)',
    'Perfusion Index (%)',
    'Peripheral Skin Temp (C)',
    'Hardware Node',
    'Protocol',
    'Clinical Status',
    'Session Notes',
  ];

  const escapeCsvCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = readings.map((r) => [
    r.id,
    new Date(r.recordedAtMs).toISOString(),
    r.heartRate,
    r.spo2,
    r.hemoglobin,
    r.perfusionIndex,
    r.skinTemp,
    r.deviceName,
    r.connectionType,
    r.status.toUpperCase(),
    r.notes,
  ]);

  const csvString = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n');

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `redsense_health_telemetry_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReadingsToPdf(
  readings: HealthReading[],
  captures: CameraCapture[],
  patientName: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Banner
  doc.setFillColor(2, 132, 199); // Medical Sky-600
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Redsense Clinical Diagnostic Telemetry Report', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Patient / Subject: ${patientName}   |   Developed by Chaitanya Sai   |   Generated: ${new Date().toLocaleString()}`,
    14,
    23
  );
  doc.text(
    'Hardware Suite: ESP32 Dual-Core + MAX30102 Pulse Oximeter (660nm/880nm) + ESP32-CAM Optical Sensor',
    14,
    28.5
  );

  // Summary Statistics Box
  const avgHr =
    readings.length > 0
      ? (readings.reduce((acc, r) => acc + r.heartRate, 0) / readings.length).toFixed(1)
      : '--';
  const avgSpo2 =
    readings.length > 0
      ? (readings.reduce((acc, r) => acc + r.spo2, 0) / readings.length).toFixed(1)
      : '--';
  const avgHb =
    readings.length > 0
      ? (readings.reduce((acc, r) => acc + r.hemoglobin, 0) / readings.length).toFixed(2)
      : '--';
  const avgPi =
    readings.length > 0
      ? (readings.reduce((acc, r) => acc + r.perfusionIndex, 0) / readings.length).toFixed(2)
      : '--';

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 38, 182, 24, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CLINICAL SUMMARY AVERAGES', 19, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Mean Heart Rate: ${avgHr} BPM`, 19, 53);
  doc.text(`Mean SpO2: ${avgSpo2}%`, 68, 53);
  doc.text(`Mean Optical Hb: ${avgHb} g/dL`, 110, 53);
  doc.text(`Mean Perfusion Index: ${avgPi}%`, 156, 53);
  doc.text(`Total Recorded Sessions: ${readings.length}   |   Optical Captures: ${captures.length}`, 19, 59);

  // Table Header
  let y = 70;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.text('TIMESTAMP', 16, y + 5.5);
  doc.text('HR (BPM)', 58, y + 5.5);
  doc.text('SpO2 (%)', 78, y + 5.5);
  doc.text('Hb (g/dL)', 98, y + 5.5);
  doc.text('PI (%)', 118, y + 5.5);
  doc.text('TEMP', 134, y + 5.5);
  doc.text('STATUS', 150, y + 5.5);
  doc.text('NOTES', 170, y + 5.5);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  readings.slice(0, 28).forEach((r, idx) => {
    if (y > 272) {
      doc.addPage();
      y = 20;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 7, 'F');
    }
    doc.setTextColor(15, 23, 42);
    const dt = new Date(r.recordedAtMs);
    const dtStr = `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    doc.text(dtStr, 16, y + 1);
    doc.text(`${r.heartRate}`, 58, y + 1);
    doc.text(`${r.spo2.toFixed(1)}%`, 78, y + 1);
    doc.text(`${r.hemoglobin.toFixed(1)}`, 98, y + 1);
    doc.text(`${r.perfusionIndex.toFixed(2)}%`, 118, y + 1);
    doc.text(`${r.skinTemp.toFixed(1)}C`, 134, y + 1);
    doc.text(r.status.toUpperCase(), 150, y + 1);
    doc.text((r.notes || 'Routine check').slice(0, 15), 170, y + 1);
    y += 7;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Generated by Redsense Health Monitoring System (Developed by Chaitanya Sai). Intended for clinical screening & physician review.',
    14,
    287
  );

  doc.save(`redsense_clinical_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
