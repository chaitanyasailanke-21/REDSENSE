import React, { useState } from 'react';
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
  Legend,
} from 'recharts';
import { LiveTelemetryPoint, HealthReading } from '../types/health';

interface ChartsAnalyticsViewProps {
  liveStreamData: LiveTelemetryPoint[];
  historyReadings: HealthReading[];
}

export const ChartsAnalyticsView: React.FC<ChartsAnalyticsViewProps> = ({
  liveStreamData,
  historyReadings,
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar' | 'both'>('both');
  const [dataSource, setDataSource] = useState<'live' | 'history'>('live');

  const chartData =
    dataSource === 'live'
      ? liveStreamData.map((pt) => ({
          label: pt.timeLabel,
          heartRate: pt.heartRate,
          spo2: pt.spo2,
          hemoglobin: pt.hemoglobin,
        }))
      : [...historyReadings]
          .reverse()
          .slice(-16)
          .map((r) => ({
            label: new Date(r.recordedAtMs).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            }),
            heartRate: r.heartRate,
            spo2: r.spo2,
            hemoglobin: r.hemoglobin,
          }));

  return (
    <div className="space-y-8">
      {/* Header & Chart Mode Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Dynamic Physiological Graphs & Trend Analytics
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Analyze Heart Rate (BPM), Oxygen Saturation (SpO2 %), and Non-Invasive Hemoglobin (g/dL) using real-time Line Charts and Bar Charts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Data Source Toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setDataSource('live')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                dataSource === 'live'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Stream Window
            </button>
            <button
              type="button"
              onClick={() => setDataSource('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                dataSource === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Historical Sessions
            </button>
          </div>

          {/* Chart Type Toggle (Line, Bar, Both) */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setChartType('both')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                chartType === 'both'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dual View (Line + Bar)
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                chartType === 'line'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Line Chart Only
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bar Chart Only
            </button>
          </div>
        </div>
      </div>

      {/* Line Chart Panel */}
      {(chartType === 'line' || chartType === 'both') && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Continuous Heart Rate (BPM) & Oxygen Saturation (SpO2 %) — Line Chart
              </h3>
              <p className="text-xs text-slate-500">
                Real-time time-series waveform trend from MAX30102 optical oximeter
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              Samples: {chartData.length}
            </span>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'IBM Plex Mono' }}
                />
                <YAxis
                  domain={[50, 130]}
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'IBM Plex Mono' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                    fontFamily: 'IBM Plex Mono',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  name="Heart Rate (BPM)"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0284C7' }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="spo2"
                  name="SpO2 (%)"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0D9488' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bar Chart Panel */}
      {(chartType === 'bar' || chartType === 'both') && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Comparative Heart Rate, SpO2 & Optical Hemoglobin — Bar Chart
              </h3>
              <p className="text-xs text-slate-500">
                Discrete interval comparison across consecutive sensor readings
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              MAX30102 + ESP32-CAM Optical
            </span>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'IBM Plex Mono' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'IBM Plex Mono' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                    fontFamily: 'IBM Plex Mono',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar
                  dataKey="heartRate"
                  name="Heart Rate (BPM)"
                  fill="#0284C7"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="spo2"
                  name="SpO2 (%)"
                  fill="#0D9488"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="hemoglobin"
                  name="Hemoglobin (g/dL)"
                  fill="#2563EB"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
