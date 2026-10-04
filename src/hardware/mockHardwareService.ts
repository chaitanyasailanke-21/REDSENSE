import { Esp32SensorPacket, HardwareNodeInfo } from '../models/redsenseTypes';

/**
 * Generates deterministic, realistic DEMO DATA packets for ESP32 + MAX30102 + AS7341.
 * Allows switching between Lower Risk, Elevated Risk, and Poor Signal Quality scenarios for testing.
 */
export class MockHardwareService {
  private tick = 0;

  generatePacket(
    scenario: 'lower_risk' | 'elevated_risk' | 'insufficient_quality' = 'lower_risk'
  ): Esp32SensorPacket {
    this.tick += 1;
    const wave = Math.sin(this.tick * 0.45);

    if (scenario === 'insufficient_quality') {
      return {
        device_id: 'REDSENSE-ESP32-001',
        timestamp: Math.floor(Date.now() / 1000),
        heart_rate: 76,
        spo2: 96,
        signal_quality: 38,
        ir: 42100,
        red: 36800,
        spectral: {
          '415': 65,
          '445': 72,
          '480': 80,
          '515': 84,
          '555': 90,
          '590': 95,
          '630': 102,
          '680': 108,
          '910': 88,
          '940': 82,
        },
        isDemo: true,
      };
    }

    if (scenario === 'elevated_risk') {
      // Lower 555nm/630nm Q-band absorption ratio & altered red/IR optical reflectance profile
      return {
        device_id: 'REDSENSE-ESP32-001',
        timestamp: Math.floor(Date.now() / 1000),
        heart_rate: Math.round(82 + wave * 2),
        spo2: Number((97.8 + wave * 0.3).toFixed(1)),
        signal_quality: 91,
        ir: 121800 + Math.round(wave * 950),
        red: 108400 + Math.round(wave * 820),
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
        isDemo: true,
      };
    }

    // Default: 'lower_risk' demo baseline matching the specification packet
    return {
      device_id: 'REDSENSE-ESP32-001',
      timestamp: Math.floor(Date.now() / 1000),
      heart_rate: Math.round(78 + wave * 2),
      spo2: Number((98.0 + wave * 0.3).toFixed(1)),
      signal_quality: 92,
      ir: 123456 + Math.round(wave * 900),
      red: 98765 + Math.round(wave * 750),
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
      isDemo: true,
    };
  }

  getHardwareNodes(isDemoMode: boolean, isHardwareConnected: boolean): HardwareNodeInfo[] {
    const status = isDemoMode ? 'Demo' : isHardwareConnected ? 'Connected' : 'Disconnected';
    const now = Date.now();
    return [
      {
        id: 'node_esp32',
        name: 'ESP32 Dual-Core MCU',
        role: 'ESP32',
        deviceId: 'REDSENSE-ESP32-001',
        status,
        lastReceivedTimestamp: now,
        signalQuality: isDemoMode || isHardwareConnected ? 94 : 0,
        batteryPct: 91,
        rssi: -46,
        details: 'Primary telemetry controller · BLE GATT & Wi-Fi WebSocket',
      },
      {
        id: 'node_max30102',
        name: 'MAX30102 PPG & Pulse Oximeter',
        role: 'MAX30102',
        deviceId: 'MAX30102-I2C-0x57',
        status,
        lastReceivedTimestamp: now,
        signalQuality: isDemoMode || isHardwareConnected ? 92 : 0,
        details: '660nm Red / 880nm IR LEDs · 18-bit ADC physiological supporting stream',
      },
      {
        id: 'node_esp32cam',
        name: 'ESP32-CAM Optical Imaging Module',
        role: 'ESP32-CAM',
        deviceId: 'REDSENSE-CAM-OV2640',
        status,
        lastReceivedTimestamp: now,
        signalQuality: isDemoMode || isHardwareConnected ? 90 : 0,
        details: 'Controlled white LED ring · Nailbed & conjunctival optical acquisition',
      },
      {
        id: 'node_as7341',
        name: 'AS7341 11-Channel Spectral Sensor',
        role: 'AS7341',
        deviceId: 'AS7341-I2C-0x39',
        status,
        lastReceivedTimestamp: now,
        signalQuality: isDemoMode || isHardwareConnected ? 95 : 0,
        details: '415nm–940nm multi-wavelength optical reflectance spectrometer',
      },
    ];
  }
}

export const mockHardwareService = new MockHardwareService();
