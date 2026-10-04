export type ConnectionProtocol = 'BLE' | 'WiFi';
export type ClinicalStatus = 'nominal' | 'warning' | 'critical';
export type CaptureMode =
  | 'Sclera Hemoglobin Scan'
  | 'Fingertip PPG Optical'
  | 'MAX30102 Sensor Alignment';

export interface HealthReading {
  id: string;
  ownerId: string;
  heartRate: number; // BPM (e.g. 72)
  spo2: number; // % (e.g. 98)
  hemoglobin: number; // g/dL (e.g. 14.4 - EzeCheck optical screening)
  perfusionIndex: number; // % (e.g. 4.2)
  skinTemp: number; // °C (e.g. 36.6)
  deviceName: string;
  connectionType: ConnectionProtocol;
  status: ClinicalStatus;
  notes: string;
  recordedAtMs: number;
}

export interface CameraCapture {
  id: string;
  ownerId: string;
  title: string;
  captureMode: CaptureMode;
  resolution: string;
  estimatedHb: number;
  spo2AtCapture: number;
  heartRateAtCapture: number;
  imageDataUrl: string;
  recordedAtMs: number;
}

export interface Esp32Device {
  id: string;
  name: string;
  protocol: ConnectionProtocol;
  address: string; // MAC address or IP address
  rssi: number; // dBm signal strength
  firmwareVersion: string;
  sensors: string[];
  batteryPct: number;
  streamUrl?: string;
}

export interface LiveTelemetryPoint {
  timeLabel: string;
  timestamp: number;
  heartRate: number;
  spo2: number;
  hemoglobin: number;
  ppgWave: number;
  redAdc: number;
  irAdc: number;
}
