import React, { useState } from 'react';
import {
  FileText,
  Share2,
  FileSpreadsheet,
  Eye,
  Trash2,
  Calendar,
  X,
} from 'lucide-react';
import { ScreeningSessionRecord } from '../models/redsenseTypes';
import { downloadSessionPdf, shareSessionPdf } from '../services/pdfService';
import { exportSessionsToCsv } from '../services/csvService';

interface HistoryReportsPageProps {
  mode: 'history' | 'reports';
  sessions: ScreeningSessionRecord[];
  selectedSession: ScreeningSessionRecord | null;
  onSelectSession: (s: ScreeningSessionRecord | null) => void;
  onDeleteSession: (id: string) => void;
  subjectName: string;
}

export const HistoryReportsPage: React.FC<HistoryReportsPageProps> = ({
  mode,
  sessions,
  selectedSession,
  onSelectSession,
  onDeleteSession,
  subjectName,
}) => {
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | 'custom' | 'all'>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const now = Date.now();
  const DAY = 24 * 3600 * 1000;

  const filteredSessions = sessions.filter((s) => {
    const age = now - s.timestamp;
    if (dateFilter === 'today') return age <= DAY;
    if (dateFilter === '7d') return age <= 7 * DAY;
    if (dateFilter === '30d') return age <= 30 * DAY;
    if (dateFilter === 'custom') {
      const startMs = customStart ? new Date(customStart).getTime() : 0;
      const endMs = customEnd ? new Date(customEnd).getTime() + DAY : Infinity;
      return s.timestamp >= startMs && s.timestamp <= endMs;
    }
    return true;
  });

  const activeSession = selectedSession || filteredSessions[0] || sessions[0] || null;

  const handleSharePdf = async (session: ScreeningSessionRecord) => {
    const msg = await shareSessionPdf(session, subjectName);
    setShareFeedback(msg);
    setTimeout(() => setShareFeedback(null), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Header & Export Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {mode === 'history'
              ? 'REDSENSE Screening Session History'
              : 'REDSENSE Research Reports & CSV/PDF Export'}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Screening result only — not a medical diagnosis. Laboratory hemoglobin/CBC testing is required for clinical confirmation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportSessionsToCsv(filteredSessions)}
            disabled={filteredSessions.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-teal-600" />
            <span>Export CSV ({filteredSessions.length})</span>
          </button>

          {activeSession && (
            <>
              <button
                type="button"
                onClick={() => downloadSessionPdf(activeSession, subjectName)}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <span>Download PDF Report</span>
              </button>
              <button
                type="button"
                onClick={() => handleSharePdf(activeSession)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span>Share PDF</span>
              </button>
            </>
          )}
        </div>
      </div>

      {shareFeedback && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900">
          {shareFeedback}
        </div>
      )}

      {/* Timeframe Filters: Today, 7 days, 30 days, Custom */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 days' },
              { id: '30d', label: '30 days' },
              { id: 'custom', label: 'Custom Range' },
              { id: 'all', label: 'All Sessions' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setDateFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                dateFilter === f.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs"
            />
            <span>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs"
            />
          </div>
        )}
      </div>

      {/* Sessions Table + Complete Session Inspection View */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 pl-4 pr-2">Date &amp; Time</th>
                  <th className="px-2 py-3">Screening Output</th>
                  <th className="px-2 py-3 text-right">Confidence</th>
                  <th className="px-2 py-3 text-right">Signal</th>
                  <th className="px-2 py-3">Device ID</th>
                  <th className="py-3 pl-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSessions.map((s) => {
                  const isSelected = activeSession?.id === s.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => onSelectSession(s)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 pl-4 pr-2 font-mono text-slate-700 whitespace-nowrap tabular-nums">
                        {new Date(s.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        ·{' '}
                        {new Date(s.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {s.isDemo && (
                          <span className="block text-[10px] text-amber-700 font-semibold">
                            DEMO DATA
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3.5 font-semibold text-slate-900">
                        {s.screeningOutcome}
                      </td>
                      <td className="px-2 py-3.5 text-right font-mono tabular-nums text-slate-800">
                        {s.confidence}%
                      </td>
                      <td className="px-2 py-3.5 text-right font-mono tabular-nums text-sky-700">
                        {s.signalQuality}%
                      </td>
                      <td className="px-2 py-3.5 font-mono text-slate-500">
                        {s.deviceId}
                      </td>
                      <td
                        className="py-3.5 pl-2 pr-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectSession(s)}
                            className="text-sky-600 hover:text-sky-800 cursor-pointer"
                            title="Inspect session"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadSessionPdf(s, subjectName)}
                            className="text-slate-500 hover:text-slate-900 cursor-pointer"
                            title="Download PDF"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSession(s.id)}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Delete session"
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
        </div>

        {/* Complete Screening Session Report Preview Card */}
        <div className="lg:col-span-5">
          {activeSession ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="font-mono text-[11px] font-semibold text-sky-700">
                    REDSENSE REPORT PREVIEW · {activeSession.isDemo ? 'DEMO DATA' : 'HARDWARE'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {activeSession.screeningOutcome}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {new Date(activeSession.timestamp).toLocaleString()}
                  </p>
                </div>
                {selectedSession && (
                  <button
                    type="button"
                    onClick={() => onSelectSession(null)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-slate-400 block text-[10px]">CONFIDENCE</span>
                  <span className="text-sm font-bold text-slate-900">
                    {activeSession.confidence}%
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-slate-400 block text-[10px]">SIGNAL QUALITY</span>
                  <span className="text-sm font-bold text-slate-900">
                    {activeSession.signalQuality}%
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-slate-400 block text-[10px]">SUPPORTING HR / SpO2</span>
                  <span className="text-sm font-bold text-slate-900">
                    {activeSession.heartRate} BPM · {activeSession.spo2}%
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-slate-400 block text-[10px]">DEVICE ID</span>
                  <span className="text-sm font-bold text-slate-900 truncate block">
                    {activeSession.deviceId}
                  </span>
                </div>
              </div>

              {/* Spectral Channels Summary */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">
                  AS7341 Spectral Measurements (415nm–910nm)
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-[11px] font-mono">
                  {(['415', '445', '480', '515', '555', '590', '630', '680', '910'] as const).map(
                    (wl) => (
                      <div
                        key={wl}
                        className="rounded border border-slate-100 bg-slate-50 px-2 py-1 text-center"
                      >
                        <span className="text-slate-400 block text-[10px]">{wl}nm</span>
                        <span className="font-semibold text-slate-800">
                          {activeSession.spectral[wl]}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Captured Thumbnail Preview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <img
                    src={activeSession.nailbedImageUrl}
                    alt="Nailbed Capture"
                    referrerPolicy="no-referrer"
                    className="h-24 w-full object-cover"
                  />
                  <div className="p-1.5 text-center font-mono text-[10px] text-slate-600">
                    Nailbed ROI
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <img
                    src={activeSession.conjunctivaImageUrl}
                    alt="Conjunctival Capture"
                    referrerPolicy="no-referrer"
                    className="h-24 w-full object-cover"
                  />
                  <div className="p-1.5 text-center font-mono text-[10px] text-slate-600">
                    Optical Acquisition
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-950 leading-relaxed">
                <strong>Screening result only — not a medical diagnosis.</strong>{' '}
                {activeSession.recommendation}
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => downloadSessionPdf(activeSession, subjectName)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSharePdf(activeSession)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share PDF</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
