import React, { useState } from 'react';
import { Bluetooth, Wifi, Cpu, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  CommunicationMode,
  Esp32SensorPacket,
  HardwareNodeInfo,
  RedsenseHardwareConfig,
} from '../models/redsenseTypes';
import {
  esp32Service,
  parseSensorPacket,
  serializeSensorPacket,
} from '../hardware/esp32Service';
import { hardwareRigAsset } from '../hardware/esp32CamService';

interface DevicesPageProps {
  config: RedsenseHardwareConfig;
  onUpdateConfig: (next: RedsenseHardwareConfig) => void;
  hardwareNodes: HardwareNodeInfo[];
  currentPacket: Esp32SensorPacket;
  onInjectPacket: (pkt: Esp32SensorPacket) => void;
}

export const DevicesPage: React.FC<DevicesPageProps> = ({
  config,
  onUpdateConfig,
  hardwareNodes,
  currentPacket,
  onInjectPacket,
}) => {
  const [jsonInput, setJsonInput] = useState<string>(() =>
    serializeSensorPacket(currentPacket)
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleModeSwitch = (mode: CommunicationMode) => {
    setErrorMessage(null);
    onUpdateConfig({ ...config, communicationMode: mode });
    if (mode === 'DEMO') {
      esp32Service.disconnect();
      setStatusMessage('DEMO Mode active — simulating ESP32, MAX30102, ESP32-CAM, and AS7341.');
    } else if (mode === 'Wi-Fi') {
      setStatusMessage(
        `Hardware Wi-Fi Mode active — ready to connect to ws://${config.esp32HostIp}/ws`
      );
    } else {
      setStatusMessage(
        `Hardware Bluetooth Mode active — ready for Web Bluetooth GATT pairing.`
      );
    }
  };

  const handleConnectHardware = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (config.communicationMode === 'Bluetooth') {
      const res = await esp32Service.connectBluetooth(config.bleServiceUuid);
      if (res.connected) {
        setStatusMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
      return;
    }

    if (config.communicationMode === 'Wi-Fi') {
      esp32Service.connectWifiStream(
        config.esp32HostIp,
        (pkt) => {
          onInjectPacket(pkt);
          setStatusMessage(`Received live JSON packet from ${pkt.device_id}`);
        },
        (errMsg) => {
          setErrorMessage(errMsg);
        }
      );
    }
  };

  const handleValidateAndInjectJson = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const parsed = parseSensorPacket(
        jsonInput,
        config.communicationMode === 'DEMO'
      );
      onInjectPacket(parsed);
      setStatusMessage(
        `Valid ESP32 JSON packet parsed for device "${parsed.device_id}" (Signal Quality: ${parsed.signal_quality}%).`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to parse JSON sensor packet.'
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Communication Mode Selector */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            REDSENSE Hardware &amp; Sensor Connectivity
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Manage ESP32, MAX30102, ESP32-CAM, and AS7341 across DEMO, Wi-Fi, and Bluetooth communication modes.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['DEMO', 'Wi-Fi', 'Bluetooth'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleModeSwitch(mode)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                config.communicationMode === mode
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode} Mode
            </button>
          ))}
        </div>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4 Hardware Sensor Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {hardwareNodes.map((node) => (
          <div
            key={node.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-mono font-semibold text-sky-700">
                  {node.role}
                </span>
                <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                  {node.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{node.details}</p>
              </div>
              <span
                className={`font-mono text-xs font-semibold whitespace-nowrap ${
                  node.status === 'Connected'
                    ? 'text-emerald-700'
                    : node.status === 'Demo'
                    ? 'text-sky-700'
                    : 'text-rose-700'
                }`}
              >
                ● {node.status}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs font-mono text-slate-600 tabular-nums">
              <div>
                <span className="text-slate-400 block text-[10px]">DEVICE ID</span>
                {node.deviceId}
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SIGNAL QUALITY</span>
                {node.signalQuality}%
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">LAST RECEIVED</span>
                {new Date(node.lastReceivedTimestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hardware Connection Settings & ESP32 JSON Protocol Inspector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <img
            src={hardwareRigAsset}
            alt="REDSENSE ESP32 MAX30102 ESP32-CAM AS7341 Prototype"
            referrerPolicy="no-referrer"
            className="h-44 w-full object-cover"
          />
          <div className="p-5 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Hardware Endpoint Configuration
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ESP32 Wi-Fi Host / WebSocket IP
                </label>
                <input
                  type="text"
                  value={config.esp32HostIp}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, esp32HostIp: e.target.value })
                  }
                  placeholder="192.168.1.100:81"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 focus:border-sky-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ESP32-CAM HTTP IP Address
                </label>
                <input
                  type="text"
                  value={config.esp32CamIp}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, esp32CamIp: e.target.value })
                  }
                  placeholder="192.168.1.100"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 focus:border-sky-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  BLE Service UUID
                </label>
                <input
                  type="text"
                  value={config.bleServiceUuid}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, bleServiceUuid: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 focus:border-sky-600 focus:outline-none"
                />
              </div>
            </div>

            {config.communicationMode !== 'DEMO' && (
              <button
                type="button"
                onClick={handleConnectHardware}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
              >
                {config.communicationMode === 'Bluetooth' ? (
                  <Bluetooth className="h-4 w-4" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
                <span>Connect {config.communicationMode} Hardware</span>
              </button>
            )}
          </div>
        </div>

        {/* ESP32 JSON Data Protocol Tester */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                ESP32 JSON Telemetry Protocol (`parseSensorPacket` &amp; `validateSensorPacket`)
              </h3>
              <Cpu className="h-4 w-4 text-sky-600" />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Test or simulate incoming ESP32 JSON payloads containing MAX30102 (`heart_rate`, `spo2`, `ir`, `red`) and AS7341 (`spectral`: `415`–`940` nm) channels.
            </p>
          </div>

          <form onSubmit={handleValidateAndInjectJson} className="space-y-3">
            <textarea
              rows={12}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-100 focus:border-sky-600 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setJsonInput(serializeSensorPacket(currentPacket))}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Load Latest Stream Packet
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Validate &amp; Inject Sensor Packet</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
