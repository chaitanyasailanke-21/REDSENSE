import React, { useState } from 'react';
import { Bluetooth, Wifi, RefreshCw, Radio, Send, CheckCircle2 } from 'lucide-react';
import { Esp32Device } from '../types/health';
import { hardwareRigImg } from '../data/initialReadings';

interface DeviceConnectivityViewProps {
  devices: Esp32Device[];
  activeDevice: Esp32Device | null;
  isConnected: boolean;
  onSelectDevice: (device: Esp32Device) => void;
  onDisconnect: () => void;
  onInjectCustomPacket: (packet: {
    hr: number;
    spo2: number;
    hb: number;
    pi: number;
    temp: number;
  }) => void;
}

export const DeviceConnectivityView: React.FC<DeviceConnectivityViewProps> = ({
  devices,
  activeDevice,
  isConnected,
  onSelectDevice,
  onDisconnect,
  onInjectCustomPacket,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [protocolFilter, setProtocolFilter] = useState<'ALL' | 'BLE' | 'WiFi'>('ALL');
  const [scanStatusMsg, setScanStatusMsg] = useState<string | null>(null);
  const [customJson, setCustomJson] = useState(
    '{"hr": 76, "spo2": 98.6, "hb": 14.5, "pi": 4.4, "temp": 36.7}'
  );
  const [packetFeedback, setPacketFeedback] = useState<string | null>(null);

  const filteredDevices = devices.filter(
    (d) => protocolFilter === 'ALL' || d.protocol === protocolFilter
  );

  const handleScanDevices = async () => {
    setIsScanning(true);
    setScanStatusMsg('Scanning 2.4GHz BLE GATT & local Wi-Fi mDNS for ESP32 sensor nodes...');
    await new Promise((r) => setTimeout(r, 1200));
    setIsScanning(false);
    setScanStatusMsg(`Discovered ${devices.length} active ESP32 medical telemetry nodes.`);
  };

  const handleWebBluetoothPair = async () => {
    try {
      const nav = navigator as unknown as {
        bluetooth?: {
          requestDevice: (opts: unknown) => Promise<{ name?: string; id: string }>;
        };
      };
      if (!nav.bluetooth) {
        setScanStatusMsg(
          'Web Bluetooth API is not active in this browser context; using paired EzeCheck-ESP32-MAX30102 node.'
        );
        return;
      }
      const bleDev = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b', 'heart_rate'],
      });
      setScanStatusMsg(`Paired with physical BLE hardware: ${bleDev.name || bleDev.id}`);
    } catch {
      setScanStatusMsg(
        'Physical BLE pairing cancelled or blocked by iframe policy; connected to simulated ESP32-MAX30102 stream.'
      );
    }
  };

  const handleSendTestPacket = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(customJson);
      const hr = Number(parsed.hr ?? 74);
      const spo2 = Number(parsed.spo2 ?? 98);
      const hb = Number(parsed.hb ?? 14.3);
      const pi = Number(parsed.pi ?? 4.1);
      const temp = Number(parsed.temp ?? 36.6);
      onInjectCustomPacket({ hr, spo2, hb, pi, temp });
      setPacketFeedback('Firmware packet parsed and applied to live telemetry stream.');
      setTimeout(() => setPacketFeedback(null), 3500);
    } catch {
      setPacketFeedback('Invalid JSON format. Expected keys: hr, spo2, hb, pi, temp.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Discovery Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            ESP32, MAX30102 & ESP32-CAM Hardware Connectivity
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Discover and pair with ESP32 boards over Bluetooth Low Energy (GATT) or Wi-Fi WebSocket/HTTP streams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['ALL', 'BLE', 'WiFi'] as const).map((proto) => (
              <button
                key={proto}
                type="button"
                onClick={() => setProtocolFilter(proto)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  protocolFilter === proto
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {proto === 'ALL' ? 'All Protocols' : proto}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleScanDevices}
            disabled={isScanning}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin text-sky-600' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan for Devices'}</span>
          </button>

          <button
            type="button"
            onClick={handleWebBluetoothPair}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Bluetooth className="h-3.5 w-3.5" />
            <span>Pair Hardware BLE</span>
          </button>
        </div>
      </div>

      {scanStatusMsg && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-xs text-sky-900">
          {scanStatusMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Device List */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Discovered ESP32 Nodes ({filteredDevices.length})
          </h3>

          <div className="space-y-3">
            {filteredDevices.map((dev) => {
              const isCurrent = activeDevice?.id === dev.id && isConnected;
              return (
                <div
                  key={dev.id}
                  className={`rounded-2xl border p-5 transition-colors bg-white ${
                    isCurrent ? 'border-sky-600' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        {dev.protocol === 'BLE' ? (
                          <Bluetooth className="h-4 w-4 text-sky-600 shrink-0" />
                        ) : (
                          <Wifi className="h-4 w-4 text-teal-600 shrink-0" />
                        )}
                        <span className="font-semibold text-base text-slate-900">
                          {dev.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono tabular-nums">
                        {dev.protocol} · {dev.address} · RSSI {dev.rssi} dBm · Battery {dev.batteryPct}% · {dev.firmwareVersion}
                      </p>
                      <p className="text-xs text-slate-600 pt-1">
                        Attached Sensors: {dev.sensors.join(' · ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrent ? (
                        <button
                          type="button"
                          onClick={onDisconnect}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectDevice(dev)}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Connect Node
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Firmware Communication Layer & Packet Injector */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <img
              src={hardwareRigImg}
              alt="ESP32 MAX30102 and ESP32-CAM Medical Sensor Rig"
              referrerPolicy="no-referrer"
              className="h-44 w-full object-cover"
            />
            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  ESP32 Firmware Communication Layer
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Test the JSON telemetry parser used by the Flutter `Esp32ConnectivityService` before flashing your physical ESP32 board.
                </p>
              </div>

              <div className="space-y-1.5 text-xs font-mono text-slate-600 border-y border-slate-100 py-3">
                <div>BLE Service UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b</div>
                <div>MAX30102 Notify UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8</div>
                <div>I2C Pins: SDA GPIO 21 · SCL GPIO 22 (400kHz Fast Mode)</div>
              </div>

              <form onSubmit={handleSendTestPacket} className="space-y-3">
                <label className="block text-xs font-medium text-slate-700">
                  Simulate Incoming ESP32 Firmware JSON Payload
                </label>
                <input
                  type="text"
                  value={customJson}
                  onChange={(e) => setCustomJson(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                />
                {packetFeedback && (
                  <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{packetFeedback}</span>
                  </p>
                )}
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Inject Firmware Telemetry Packet</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
