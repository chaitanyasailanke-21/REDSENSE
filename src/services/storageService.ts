import {
  CameraCaptureItem,
  RedsenseHardwareConfig,
  ScreeningSessionRecord,
} from '../models/redsenseTypes';
import { nailbedAsset, conjunctivaAsset } from '../hardware/esp32CamService';
import { DEMO_MODEL_VERSION } from '../ai/mockAiModel';

const SESSIONS_KEY = 'redsense_screening_sessions_v1';
const CAPTURES_KEY = 'redsense_camera_captures_v1';
const CONFIG_KEY = 'redsense_hardware_config_v1';

const now = Date.now();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export const INITIAL_DEMO_SESSIONS: ScreeningSessionRecord[] = [
  {
    id: 'scr_seed_001',
    ownerId: 'demo_user',
    timestamp: now - 2.5 * HOUR,
    deviceId: 'REDSENSE-ESP32-001',
    heartRate: 78,
    spo2: 98,
    signalQuality: 92,
    irRaw: 123456,
    redRaw: 98765,
    spectral: {
      '415': 120,
      '445': 135,
      '480': 150,
      '515': 160,
      '555': 180,
      '590': 200,
      '630': 230,
      '680': 250,
      '910': 190,
      '940': 170,
    },
    nailbedImageUrl: nailbedAsset,
    conjunctivaImageUrl: conjunctivaAsset,
    screeningOutcome: 'Lower anemia risk indicated',
    recommendation:
      'Screening does not indicate elevated anemia risk. Clinical confirmation via laboratory hemoglobin/CBC testing is required for medical evaluation.',
    confidence: 88,
    modelVersion: DEMO_MODEL_VERSION,
    isDemo: true,
    dataSourcesUsed: [
      'Nailbed Optical ROI (ESP32-CAM)',
      'Conjunctival Optical Acquisition (ESP32-CAM)',
      'AS7341 415nm–940nm Spectral Reflectance',
      'MAX30102 Dual-Wavelength PPG Supporting Stream',
    ],
    notes: 'DEMO DATA — Baseline morning multimodal research screening session.',
  },
  {
    id: 'scr_seed_002',
    ownerId: 'demo_user',
    timestamp: now - 3 * DAY,
    deviceId: 'REDSENSE-ESP32-001',
    heartRate: 83,
    spo2: 98,
    signalQuality: 90,
    irRaw: 121400,
    redRaw: 108200,
    spectral: {
      '415': 112,
      '445': 128,
      '480': 144,
      '515': 152,
      '555': 148,
      '590': 186,
      '630': 258,
      '680': 274,
      '910': 192,
      '940': 174,
    },
    nailbedImageUrl: nailbedAsset,
    conjunctivaImageUrl: conjunctivaAsset,
    screeningOutcome: 'Elevated anemia risk indicated',
    recommendation:
      'Clinical confirmation recommended. Laboratory hemoglobin/CBC testing and evaluation by a qualified healthcare professional are required.',
    confidence: 84,
    modelVersion: DEMO_MODEL_VERSION,
    isDemo: true,
    dataSourcesUsed: [
      'Nailbed Optical ROI (ESP32-CAM)',
      'Conjunctival Optical Acquisition (ESP32-CAM)',
      'AS7341 415nm–940nm Spectral Reflectance',
      'MAX30102 Dual-Wavelength PPG Supporting Stream',
    ],
    notes:
      'DEMO DATA — Simulated reduced 555nm/630nm Q-band optical attenuation profile for research validation.',
  },
  {
    id: 'scr_seed_003',
    ownerId: 'demo_user',
    timestamp: now - 14 * DAY,
    deviceId: 'REDSENSE-ESP32-001',
    heartRate: 75,
    spo2: 99,
    signalQuality: 94,
    irRaw: 125200,
    redRaw: 97400,
    spectral: {
      '415': 122,
      '445': 138,
      '480': 154,
      '515': 164,
      '555': 185,
      '590': 204,
      '630': 228,
      '680': 246,
      '910': 188,
      '940': 172,
    },
    nailbedImageUrl: nailbedAsset,
    conjunctivaImageUrl: conjunctivaAsset,
    screeningOutcome: 'Lower anemia risk indicated',
    recommendation:
      'Screening does not indicate elevated anemia risk. Clinical confirmation via laboratory hemoglobin/CBC testing is required for medical evaluation.',
    confidence: 90,
    modelVersion: DEMO_MODEL_VERSION,
    isDemo: true,
    dataSourcesUsed: [
      'Nailbed Optical ROI (ESP32-CAM)',
      'Conjunctival Optical Acquisition (ESP32-CAM)',
      'AS7341 415nm–940nm Spectral Reflectance',
      'MAX30102 Dual-Wavelength PPG Supporting Stream',
    ],
    notes: 'DEMO DATA — Bi-weekly optical calibration benchmark.',
  },
];

export const INITIAL_DEMO_CAPTURES: CameraCaptureItem[] = [
  {
    id: 'cap_seed_01',
    ownerId: 'demo_user',
    title: 'Nailbed Vascular Bed Optical Acquisition',
    targetRegion: 'Nailbed Optical Capture',
    imageDataUrl: nailbedAsset,
    resolution: '1600x1200 UXGA',
    signalQuality: 93,
    isDemo: true,
    timestamp: now - 2.5 * HOUR,
  },
  {
    id: 'cap_seed_02',
    ownerId: 'demo_user',
    title: 'Conjunctival / Lower Eyelid Optical Acquisition',
    targetRegion: 'Conjunctival Optical Acquisition',
    imageDataUrl: conjunctivaAsset,
    resolution: '1600x1200 UXGA',
    signalQuality: 91,
    isDemo: true,
    timestamp: now - 2.5 * HOUR,
  },
];

export const DEFAULT_HARDWARE_CONFIG: RedsenseHardwareConfig = {
  communicationMode: 'DEMO',
  esp32HostIp: '192.168.1.100:81',
  esp32CamIp: '192.168.1.100',
  bleServiceUuid: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  bleCharacteristicUuid: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
  demoScenario: 'lower_risk',
};

export class StorageService {
  loadSessions(): ScreeningSessionRecord[] {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (!raw) return INITIAL_DEMO_SESSIONS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_SESSIONS;
    } catch {
      return INITIAL_DEMO_SESSIONS;
    }
  }

  saveSessions(sessions: ScreeningSessionRecord[]): void {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore storage quota errors
    }
  }

  loadCaptures(): CameraCaptureItem[] {
    try {
      const raw = localStorage.getItem(CAPTURES_KEY);
      if (!raw) return INITIAL_DEMO_CAPTURES;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_CAPTURES;
    } catch {
      return INITIAL_DEMO_CAPTURES;
    }
  }

  saveCaptures(captures: CameraCaptureItem[]): void {
    try {
      localStorage.setItem(CAPTURES_KEY, JSON.stringify(captures));
    } catch {
      // Ignore storage quota errors
    }
  }

  loadHardwareConfig(): RedsenseHardwareConfig {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return DEFAULT_HARDWARE_CONFIG;
      return { ...DEFAULT_HARDWARE_CONFIG, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_HARDWARE_CONFIG;
    }
  }

  saveHardwareConfig(config: RedsenseHardwareConfig): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage quota errors
    }
  }
}

export const storageService = new StorageService();
