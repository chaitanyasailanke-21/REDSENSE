import { ScreeningSessionRecord } from '../models/redsenseTypes';

export function exportSessionsToCsv(sessions: ScreeningSessionRecord[]): void {
  const headers = [
    'Session ID',
    'Timestamp (ISO)',
    'Data Mode',
    'Device ID',
    'Screening Outcome (Non-Diagnostic)',
    'Model Confidence (%)',
    'Signal Quality (%)',
    'Heart Rate (BPM)',
    'SpO2 (%)',
    'Raw IR ADC',
    'Raw Red ADC',
    'Spectral 415nm',
    'Spectral 445nm',
    'Spectral 480nm',
    'Spectral 515nm',
    'Spectral 555nm',
    'Spectral 590nm',
    'Spectral 630nm',
    'Spectral 680nm',
    'Spectral 910nm',
    'Model Version',
    'Disclaimer',
  ];

  const escapeCsv = (val: unknown) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = sessions.map((s) => [
    s.id,
    new Date(s.timestamp).toISOString(),
    s.isDemo ? 'DEMO DATA' : 'HARDWARE',
    s.deviceId,
    s.screeningOutcome,
    s.confidence,
    s.signalQuality,
    s.heartRate,
    s.spo2,
    s.irRaw,
    s.redRaw,
    s.spectral['415'],
    s.spectral['445'],
    s.spectral['480'],
    s.spectral['515'],
    s.spectral['555'],
    s.spectral['590'],
    s.spectral['630'],
    s.spectral['680'],
    s.spectral['910'],
    s.modelVersion,
    'Screening result only - not a medical diagnosis. Clinical confirmation recommended.',
  ]);

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map((r) => r.map(escapeCsv).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `redsense_screening_sessions_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
