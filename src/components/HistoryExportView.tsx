import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Trash2, Search, Edit3, Check, X } from 'lucide-react';
import { HealthReading, CameraCapture } from '../types/health';
import { exportReadingsToCsv, exportReadingsToPdf } from '../services/exportService';

interface HistoryExportViewProps {
  readings: HealthReading[];
  captures: CameraCapture[];
  patientName: string;
  onUpdateNotes: (readingId: string, notes: string) => Promise<void>;
  onDeleteReading: (readingId: string) => Promise<void>;
}

export const HistoryExportView: React.FC<HistoryExportViewProps> = ({
  readings,
  captures,
  patientName,
  onUpdateNotes,
  onDeleteReading,
}) => {
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'all'>('month');
  const [statusFilter, setStatusFilter] = useState<'all' | 'nominal' | 'warning' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  const now = Date.now();
  const DAY_MS = 24 * 3600 * 1000;

  const filteredReadings = readings.filter((r) => {
    const ageMs = now - r.recordedAtMs;
    if (timeFilter === 'day' && ageMs > DAY_MS) return false;
    if (timeFilter === 'week' && ageMs > 7 * DAY_MS) return false;
    if (timeFilter === 'month' && ageMs > 30 * DAY_MS) return false;

    if (statusFilter !== 'all' && r.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDevice = r.deviceName.toLowerCase().includes(q);
      const matchNotes = r.notes.toLowerCase().includes(q);
      if (!matchDevice && !matchNotes) return false;
    }

    return true;
  });

  const handleSaveEdit = async (id: string) => {
    await onUpdateNotes(id, editNoteText.slice(0, 500));
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & CSV/PDF Export Buttons */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Session History & Clinical Export
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Review timestamped MAX30102 & ESP32 sessions, filter by Day, Week, or Month, and export reports as CSV or formatted PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportReadingsToCsv(filteredReadings)}
            disabled={filteredReadings.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-40 whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-teal-600" />
            <span>Export CSV ({filteredReadings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => exportReadingsToPdf(filteredReadings, captures, patientName)}
            disabled={filteredReadings.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors disabled:opacity-40 whitespace-nowrap cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span>Export Clinical PDF Report</span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Day / Week / Month + Status + Search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Filter */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: 'day', label: 'Day (24h)' },
                { id: 'week', label: 'Week (7d)' },
                { id: 'month', label: 'Month (30d)' },
                { id: 'all', label: 'All Records' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTimeFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  timeFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Clinical Status Filter */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['all', 'nominal', 'warning', 'critical'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or device..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
          />
        </div>
      </div>

      {/* High-Density Clinical Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {filteredReadings.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-800">
              No health readings match the selected timeframe or filter.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Switch the timeframe filter to "Month (30d)" or record a new snapshot from the Dashboard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 pl-5 pr-3">Timestamp</th>
                  <th className="px-3 py-3 text-right">Heart Rate</th>
                  <th className="px-3 py-3 text-right">SpO2</th>
                  <th className="px-3 py-3 text-right">Optical Hb</th>
                  <th className="px-3 py-3 text-right">PI / Temp</th>
                  <th className="px-3 py-3">Hardware Node</th>
                  <th className="px-3 py-3">Evaluation</th>
                  <th className="px-3 py-3">Clinical Notes</th>
                  <th className="py-3 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredReadings.map((reading) => {
                  const dt = new Date(reading.recordedAtMs);
                  const isEditing = editingId === reading.id;
                  return (
                    <tr
                      key={reading.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 pl-5 pr-3 font-mono text-slate-700 whitespace-nowrap tabular-nums">
                        {dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                        · {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                        {reading.heartRate} <span className="text-slate-400 font-normal">BPM</span>
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono font-semibold text-teal-700 whitespace-nowrap tabular-nums">
                        {reading.spo2.toFixed(1)}%
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono font-semibold text-sky-700 whitespace-nowrap tabular-nums">
                        {reading.hemoglobin.toFixed(1)}{' '}
                        <span className="text-slate-400 font-normal">g/dL</span>
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-600 whitespace-nowrap tabular-nums">
                        {reading.perfusionIndex.toFixed(1)}% · {reading.skinTemp.toFixed(1)}°C
                      </td>
                      <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">
                        {reading.deviceName} · {reading.connectionType}
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {reading.status === 'nominal' && (
                          <span className="text-emerald-700 font-medium">● Nominal</span>
                        )}
                        {reading.status === 'warning' && (
                          <span className="text-amber-700 font-medium">▲ Warning</span>
                        )}
                        {reading.status === 'critical' && (
                          <span className="text-rose-700 font-medium">✖ Critical</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-slate-600 max-w-xs">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editNoteText}
                              onChange={(e) => setEditNoteText(e.target.value)}
                              maxLength={500}
                              className="w-full rounded border border-sky-500 px-2 py-1 text-xs text-slate-900 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(reading.id)}
                              className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"
                              title="Save note"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="line-clamp-1">{reading.notes || '—'}</span>
                        )}
                      </td>
                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {reading.status !== 'critical' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(reading.id);
                                setEditNoteText(reading.notes);
                              }}
                              className="text-slate-400 hover:text-sky-600 transition-colors cursor-pointer"
                              title="Edit clinical note"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteReading(reading.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete reading"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
