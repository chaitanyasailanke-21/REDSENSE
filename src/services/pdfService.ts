import { jsPDF } from 'jspdf';
import { ScreeningSessionRecord } from '../models/redsenseTypes';

/**
 * Generates a professional REDSENSE Non-Invasive Anemia Screening Research Report PDF.
 * Explicitly includes the mandatory research & clinical confirmation disclaimer.
 */
export function buildSessionPdfDocument(
  session: ScreeningSessionRecord,
  subjectName: string
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Top Header Banner
  doc.setFillColor(15, 23, 42); // Dark Navy
  doc.rect(0, 0, 210, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('REDSENSE', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Non-Invasive Anemia Screening Research Prototype  |  Developed by Chaitanya Sai',
    14,
    21
  );
  doc.text(
    `Session ID: ${session.id}   |   Date: ${new Date(session.timestamp).toLocaleString()}   |   Mode: ${
      session.isDemo ? 'DEMO DATA (SIMULATED)' : 'HARDWARE ACQUISITION'
    }`,
    14,
    28
  );

  // Mandatory Non-Diagnostic Research Notice Box
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(14, 40, 182, 18, 2, 2, 'FD');

  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('SCREENING RESULT ONLY — NOT A MEDICAL DIAGNOSIS', 18, 46.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'REDSENSE is a research screening prototype. Laboratory hemoglobin/CBC testing and evaluation by a qualified',
    18,
    51.5
  );
  doc.text(
    'healthcare professional are required for clinical confirmation. Supporting SpO2/PPG values do not diagnose anemia.',
    18,
    55.5
  );

  // Screening Result Summary Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 64, 182, 34, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('MULTIMODAL SCREENING OUTPUT', 19, 72);

  doc.setFontSize(14);
  if (session.screeningOutcome === 'Elevated anemia risk indicated') {
    doc.setTextColor(180, 83, 9);
  } else if (session.screeningOutcome === 'Lower anemia risk indicated') {
    doc.setTextColor(5, 150, 105);
  } else {
    doc.setTextColor(100, 116, 139);
  }
  doc.text(session.screeningOutcome.toUpperCase(), 19, 81);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Subject: ${subjectName}   |   Model Confidence: ${session.confidence}%   |   Signal Quality: ${session.signalQuality}%`,
    19,
    88
  );
  doc.text(`Model Version: ${session.modelVersion}   |   Device ID: ${session.deviceId}`, 19, 94);

  // Supporting Physiological & Optical Metrics
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 104, 182, 30, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('MAX30102 PHYSIOLOGICAL & OPTICAL SUPPORTING TELEMETRY', 19, 112);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Heart Rate: ${session.heartRate} BPM`, 19, 120);
  doc.text(`SpO2 (Supporting Context): ${session.spo2}%`, 75, 120);
  doc.text(`Signal Quality Score: ${session.signalQuality}%`, 140, 120);
  doc.text(`Raw IR ADC: ${session.irRaw}`, 19, 127);
  doc.text(`Raw Red ADC: ${session.redRaw}`, 75, 127);
  doc.text(
    `Data State: ${session.isDemo ? 'DEMO DATA' : 'Hardware Sensor Stream'}`,
    140,
    127
  );

  // AS7341 Spectral Measurements Table
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 140, 182, 38, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('AS7341 MULTI-SPECTRAL REFLECTANCE CHANNELS (415 nm – 940 nm)', 19, 148);

  const channels: Array<keyof ScreeningSessionRecord['spectral']> = [
    '415',
    '445',
    '480',
    '515',
    '555',
    '590',
    '630',
    '680',
    '910',
    '940',
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  channels.forEach((ch, idx) => {
    const col = idx % 5;
    const row = Math.floor(idx / 5);
    const x = 19 + col * 35;
    const y = 158 + row * 10;
    doc.text(`${ch} nm: ${session.spectral[ch] ?? 170}`, x, y);
  });

  // Data Sources & Clinical Recommendation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('MULTIMODAL DATA SOURCES & RECOMMENDATION', 14, 190);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  session.dataSourcesUsed.forEach((src, i) => {
    doc.text(`• ${src}`, 16, 197 + i * 6);
  });

  doc.setFont('helvetica', 'bold');
  doc.text('Recommendation:', 14, 226);
  doc.setFont('helvetica', 'normal');
  const wrappedRec = doc.splitTextToSize(session.recommendation, 180);
  doc.text(wrappedRec, 14, 232);

  // Footer Medical Disclaimer
  doc.setDrawColor(203, 213, 225);
  doc.line(14, 272, 196, 272);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'MEDICAL DISCLAIMER: Screening result only — not a medical diagnosis. Laboratory hemoglobin/CBC testing and a qualified',
    14,
    278
  );
  doc.text(
    'healthcare professional are required for confirmation. REDSENSE Research Prototype developed by Chaitanya Sai.',
    14,
    283
  );

  return doc;
}

export function downloadSessionPdf(
  session: ScreeningSessionRecord,
  subjectName = 'Research Participant'
): void {
  const doc = buildSessionPdfDocument(session, subjectName);
  doc.save(`redsense_screening_report_${session.id}.pdf`);
}

export async function shareSessionPdf(
  session: ScreeningSessionRecord,
  subjectName = 'Research Participant'
): Promise<string> {
  const doc = buildSessionPdfDocument(session, subjectName);
  const pdfBlob = doc.output('blob');
  const file = new File([pdfBlob], `redsense_screening_${session.id}.pdf`, {
    type: 'application/pdf',
  });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: 'REDSENSE Screening Report',
      text: 'Screening result only — not a medical diagnosis. Clinical confirmation recommended.',
      files: [file],
    });
    return 'Shared via native system share sheet.';
  } else {
    doc.save(`redsense_screening_report_${session.id}.pdf`);
    return 'Downloaded PDF report (native Web Share API not supported in this browser).';
  }
}
