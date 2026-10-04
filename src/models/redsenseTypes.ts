export type CommunicationMode = 'DEMO' | 'Wi-Fi' | 'Bluetooth';
export type ConnectionState = 'Connected' | 'Connecting' | 'Disconnected' | 'Demo' | 'Error';

export type ScreeningOutcome =
  | 'Elevated anemia risk indicated'
  | 'Lower anemia risk indicated'
  | 'Insufficient data';

export interface SpectralChannels {
  '415': number;
  '445': number;
  '480': number;
  '515': number;
  '555': number;
  '590': number;
  '630': number;
  '680': number;
  '910': number;
  '940'?: number;
}

export interface Esp32SensorPacket {
  device_id: string;
  timestamp: number;
  heart_rate: number;
  spo2: number;
  signal_quality: number;
  ir: number;
  red: number;
  spectral: SpectralChannels;
  isDemo?: boolean;
}

export interface HardwareNodeInfo {
  id: string;
  name: string;
  role: 'ESP32' | 'MAX30102' | 'ESP32-CAM' | 'AS7341';
  deviceId: string;
  status: ConnectionState;
  lastReceivedTimestamp: number;
  signalQuality: number;
  batteryPct?: number;
  rssi?: number;
  details: string;
}

export interface DataQualityCheckResult {
  isValid: boolean;
  nailbedImageAvailable: boolean;
  conjunctivaImageAvailable: boolean;
  imageQualityAcceptable: boolean;
  ppgSignalAvailable: boolean;
  spectralDataAvailable: boolean;
  timestampValid: boolean;
  deviceConnected: boolean;
  summaryMessage: string;
}

export interface MultimodalFeatures {
  imageFeatures: {
    nailbedRednessIndex: number;
    conjunctivaPallorIndex: number;
    illuminationUniformity: number;
  };
  spectralFeatures: {
    soretBandRatio415_555: number;
    qBandRatio555_630: number;
    nirReferenceRatio680_910: number;
    normalizedChannels: number[];
  };
  ppgFeatures: {
    acDcRatioRed: number;
    acDcRatioIr: number;
    perfusionStability: number;
    heartRateBpm: number;
    spo2Pct: number;
  };
}

export interface ScreeningSessionRecord {
  id: string;
  ownerId: string;
  timestamp: number;
  deviceId: string;
  heartRate: number;
  spo2: number;
  signalQuality: number;
  irRaw: number;
  redRaw: number;
  spectral: SpectralChannels;
  nailbedImageUrl: string;
  conjunctivaImageUrl: string;
  screeningOutcome: ScreeningOutcome;
  recommendation: string;
  confidence: number;
  modelVersion: string;
  isDemo: boolean;
  dataSourcesUsed: string[];
  notes: string;
}

export interface CameraCaptureItem {
  id: string;
  ownerId: string;
  title: string;
  targetRegion: 'Nailbed Optical Capture' | 'Conjunctival Optical Acquisition';
  imageDataUrl: string;
  resolution: string;
  signalQuality: number;
  isDemo: boolean;
  timestamp: number;
}

export interface RedsenseHardwareConfig {
  communicationMode: CommunicationMode;
  esp32HostIp: string;
  esp32CamIp: string;
  bleServiceUuid: string;
  bleCharacteristicUuid: string;
  demoScenario: 'lower_risk' | 'elevated_risk' | 'insufficient_quality';
}
