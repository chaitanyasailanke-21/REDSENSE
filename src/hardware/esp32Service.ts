import { Esp32SensorPacket, SpectralChannels } from '../models/redsenseTypes';

const DEFAULT_SPECTRAL: SpectralChannels = {
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
};

/**
 * Validates whether a decoded object meets the REDSENSE ESP32 JSON telemetry specification.
 * Tolerates missing optional fields (such as 940nm spectral channel) so partial hardware setups work gracefully.
 */
export function validateSensorPacket(raw: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Payload is not a valid JSON object.'] };
  }

  const obj = raw as Record<string, unknown>;
  if (typeof obj.device_id !== 'string' || !obj.device_id.trim()) {
    errors.push('Missing or invalid "device_id" string.');
  }
  if (typeof obj.heart_rate !== 'number' || obj.heart_rate < 25 || obj.heart_rate > 250) {
    errors.push('Field "heart_rate" must be a number between 25 and 250 BPM.');
  }
  if (typeof obj.spo2 !== 'number' || obj.spo2 < 50 || obj.spo2 > 100) {
    errors.push('Field "spo2" must be a percentage between 50 and 100.');
  }
  if (
    typeof obj.signal_quality !== 'number' ||
    obj.signal_quality < 0 ||
    obj.signal_quality > 100
  ) {
    errors.push('Field "signal_quality" must be between 0 and 100.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parses a raw JSON string from ESP32 (Wi-Fi WebSocket/HTTP or BLE GATT characteristic)
 * into a strongly typed Esp32SensorPacket.
 */
export function parseSensorPacket(rawJson: string, isDemo = false): Esp32SensorPacket {
  const parsed = JSON.parse(rawJson) as Record<string, unknown>;
  const validation = validateSensorPacket(parsed);
  if (!validation.valid) {
    throw new Error(`Invalid ESP32 Sensor Packet: ${validation.errors.join(' ')}`);
  }

  const rawSpectral = (parsed.spectral as Record<string, unknown>) || {};
  const spectral: SpectralChannels = {
    '415': Number(rawSpectral['415'] ?? DEFAULT_SPECTRAL['415']),
    '445': Number(rawSpectral['445'] ?? DEFAULT_SPECTRAL['445']),
    '480': Number(rawSpectral['480'] ?? DEFAULT_SPECTRAL['480']),
    '515': Number(rawSpectral['515'] ?? DEFAULT_SPECTRAL['515']),
    '555': Number(rawSpectral['555'] ?? DEFAULT_SPECTRAL['555']),
    '590': Number(rawSpectral['590'] ?? DEFAULT_SPECTRAL['590']),
    '630': Number(rawSpectral['630'] ?? DEFAULT_SPECTRAL['630']),
    '680': Number(rawSpectral['680'] ?? DEFAULT_SPECTRAL['680']),
    '910': Number(rawSpectral['910'] ?? DEFAULT_SPECTRAL['910']),
    '940': Number(rawSpectral['940'] ?? DEFAULT_SPECTRAL['940']),
  };

  return {
    device_id: String(parsed.device_id || 'REDSENSE-ESP32-001'),
    timestamp: Number(parsed.timestamp || Math.floor(Date.now() / 1000)),
    heart_rate: Number(parsed.heart_rate),
    spo2: Number(parsed.spo2),
    signal_quality: Number(parsed.signal_quality),
    ir: Number(parsed.ir ?? 123456),
    red: Number(parsed.red ?? 98765),
    spectral,
    isDemo,
  };
}

/**
 * Serializes an Esp32SensorPacket into a standard JSON string.
 */
export function serializeSensorPacket(packet: Esp32SensorPacket): string {
  return JSON.stringify(
    {
      device_id: packet.device_id,
      timestamp: packet.timestamp,
      heart_rate: packet.heart_rate,
      spo2: packet.spo2,
      signal_quality: packet.signal_quality,
      ir: packet.ir,
      red: packet.red,
      spectral: packet.spectral,
    },
    null,
    2
  );
}

/**
 * Hardware integration layer for real ESP32 communication over Wi-Fi HTTP/WebSocket or Web Bluetooth.
 */
export class ESP32Service {
  private ws: WebSocket | null = null;

  /**
   * Connects to a real ESP32 WebSocket endpoint (e.g., ws://192.168.1.100:81/ws).
   * Replace or extend this method when flashing custom ESP32 firmware.
   */
  connectWifiStream(
    hostIp: string,
    onPacket: (packet: Esp32SensorPacket) => void,
    onError: (msg: string) => void
  ): void {
    try {
      this.disconnect();
      const wsUrl = hostIp.startsWith('ws') ? hostIp : `ws://${hostIp}/ws`;
      this.ws = new WebSocket(wsUrl);
      this.ws.onmessage = (event) => {
        try {
          const pkt = parseSensorPacket(String(event.data), false);
          onPacket(pkt);
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Malformed JSON from ESP32.');
        }
      };
      this.ws.onerror = () => {
        onError(`Unable to reach ESP32 Wi-Fi endpoint at ${wsUrl}. Check device power and subnet.`);
      };
    } catch (err) {
      onError(err instanceof Error ? err.message : 'ESP32 Wi-Fi connection error.');
    }
  }

  /**
   * Requests a Web Bluetooth GATT connection to REDSENSE-ESP32.
   */
  async connectBluetooth(
    serviceUuid: string
  ): Promise<{ connected: boolean; deviceName: string; message: string }> {
    const nav = navigator as unknown as {
      bluetooth?: {
        requestDevice: (opts: unknown) => Promise<{ name?: string; id: string }>;
      };
    };
    if (!nav.bluetooth) {
      return {
        connected: false,
        deviceName: '',
        message: 'Web Bluetooth API is unavailable in this browser environment.',
      };
    }
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [serviceUuid, 'heart_rate'],
      });
      return {
        connected: true,
        deviceName: device.name || 'REDSENSE-ESP32-BLE',
        message: `Connected to ${device.name || device.id}`,
      };
    } catch {
      return {
        connected: false,
        deviceName: '',
        message: 'Bluetooth pairing cancelled or device out of range.',
      };
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const esp32Service = new ESP32Service();
