/**
 * MAX30102 Pulse Oximeter & Optical PPG Sensor Service.
 * Note: MAX30102 measurements (Heart Rate, SpO2, Raw IR, Raw Red) serve as supporting
 * physiological context and signal-quality verification—they do NOT directly diagnose anemia.
 */
export interface Max30102Reading {
  heartRate: number;
  spo2: number;
  irRaw: number;
  redRaw: number;
  signalQuality: number;
  timestamp: number;
}

export class MAX30102Service {
  evaluateSignalQuality(irRaw: number, redRaw: number, reportedQuality: number): {
    label: 'Good' | 'Fair' | 'Poor';
    score: number;
    fingerPresent: boolean;
  } {
    const fingerPresent = irRaw > 50000 && redRaw > 40000;
    if (!fingerPresent || reportedQuality < 50) {
      return { label: 'Poor', score: reportedQuality, fingerPresent };
    }
    if (reportedQuality >= 80) {
      return { label: 'Good', score: reportedQuality, fingerPresent: true };
    }
    return { label: 'Fair', score: reportedQuality, fingerPresent: true };
  }
}

export const max30102Service = new MAX30102Service();
