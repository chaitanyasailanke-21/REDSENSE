import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Esp32SensorPacket } from '../models/redsenseTypes';
import { as7341Service } from '../hardware/as7341Service';
import { PpgWaveformCanvas } from '../components/PpgWaveformCanvas';

export interface LiveTelemetryHistoryItem {
  timeLabel: string;
  heartRate: number;
  spo2: number;
  signalQuality: number;
  ir: number;
  red: number;
}

interface LiveDataPageProps {
  isDemoMode: boolean;
  currentPacket: Esp32SensorPacket;
  streamHistory: LiveTelemetryHistoryItem[];
}

export const LiveDataPage: React.FC<LiveDataPageProps> = ({
  isDemoMode,
  currentPacket,
  streamHistory,
}) => {
  const spectralPoints = as7341Service.toChartPoints(currentPacket.spectral);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Real-Time Multimodal Sensor Stream
            </h2>
            {isDemoMode && (
              <span className="font-mono text-xs font-semibold text-amber-700">
                · DEMO DATA
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Live telemetry from MAX30102 optical pulse sensor and AS7341 11-channel spectrometer. Note: SpO2 and Heart Rate are supporting physiological signals and do not directly diagnose anemia.
          </p>
        </div>
        <span className="font-mono text-xs text-slate-500 tabular-nums">
          Device: {currentPacket.device_id}
        </span>
      </div>

      {/* 5 Live Numeric Readouts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Heart Rate</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {currentPacket.heart_rate} <span className="text-xs font-normal text-slate-500">BPM</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">SpO2 (Supporting)</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-teal-700 tabular-nums">
            {currentPacket.spo2}%
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Raw IR Count</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {currentPacket.ir.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Raw Red Count</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {currentPacket.red.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Signal Quality</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-sky-700 tabular-nums">
            {currentPacket.signal_quality}%
          </div>
        </div>
      </div>

      {/* Graph 1 & 2: Heart Rate Line Chart + SpO2 Line Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Heart Rate (BPM) — Real-Time Line Chart
            </h3>
            <span className="font-mono text-xs text-slate-500">
              {isDemoMode ? 'DEMO DATA' : 'MAX30102'}
            </span>
          </div>
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={streamHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'IBM Plex Mono' }}
                />
                <YAxis
                  domain={[55, 115]}
                  tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'IBM Plex Mono' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '11px',
                    fontFamily: 'IBM Plex Mono',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  name="Heart Rate (BPM)"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Supporting SpO2 (%) — Real-Time Line Chart
            </h3>
            <span className="font-mono text-xs text-slate-500">
              {isDemoMode ? 'DEMO DATA' : 'MAX30102'}
            </span>
          </div>
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={streamHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'IBM Plex Mono' }}
                />
                <YAxis
                  domain={[90, 100]}
                  tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'IBM Plex Mono' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '11px',
                    fontFamily: 'IBM Plex Mono',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="spo2"
                  name="SpO2 (%)"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Graph 3 & 4: PPG Waveform + AS7341 Spectral Response Graph */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              MAX30102 Dual-Wavelength PPG Waveform (Red &amp; IR)
            </h3>
            <span className="font-mono text-xs text-slate-500">
              {isDemoMode ? 'DEMO DATA' : 'Live ADC'}
            </span>
          </div>
          <PpgWaveformCanvas
            heartRate={currentPacket.heart_rate}
            spo2={currentPacket.spo2}
            isConnected={true}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              AS7341 Spectral Response Graph (415 nm – 940 nm)
            </h3>
            <span className="font-mono text-xs text-slate-500">
              {isDemoMode ? 'DEMO DATA' : 'AS7341'}
            </span>
          </div>
          <div className="h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spectralPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="wavelength"
                  tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'IBM Plex Mono' }}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'IBM Plex Mono' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '11px',
                    fontFamily: 'IBM Plex Mono',
                  }}
                />
                <Bar dataKey="intensity" name="Spectral Intensity" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {spectralPoints.map((pt, i) => (
                    <Cell key={i} fill={pt.colorHex} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
