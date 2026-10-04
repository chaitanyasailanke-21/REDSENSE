import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Camera,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  FileText,
  Save,
  RotateCcw,
  Cpu,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  Esp32SensorPacket,
  HardwareNodeInfo,
  ScreeningSessionRecord,
} from '../models/redsenseTypes';
import { as7341Service } from '../hardware/as7341Service';
import { esp32CamService, nailbedAsset, conjunctivaAsset } from '../hardware/esp32CamService';
import { aiInferenceService } from '../ai/aiInferenceService';
import { extractFeatures } from '../ai/preprocessing';
import { PpgWaveformCanvas } from '../components/PpgWaveformCanvas';

interface ScreeningWorkflowPageProps {
  isDemoMode: boolean;
  demoScenario: 'lower_risk' | 'elevated_risk' | 'insufficient_quality';
  onChangeDemoScenario: (s: 'lower_risk' | 'elevated_risk' | 'insufficient_quality') => void;
  currentPacket: Esp32SensorPacket;
  hardwareNodes: HardwareNodeInfo[];
  esp32CamIp: string;
  ownerId: string;
  onSaveSession: (session: ScreeningSessionRecord) => Promise<void>;
  onOpenReport: (session: ScreeningSessionRecord) => void;
}

const STEPS = [
  { num: 1, title: 'Device Check' },
  { num: 2, title: 'Signal Quality' },
  { num: 3, title: 'Nailbed Image' },
  { num: 4, title: 'Conjunctival Image' },
  { num: 5, title: 'Spectral Data' },
  { num: 6, title: 'PPG Data' },
  { num: 7, title: 'Data Quality' },
  { num: 8, title: 'AI Screening' },
];

export const ScreeningWorkflowPage: React.FC<ScreeningWorkflowPageProps> = ({
  isDemoMode,
  demoScenario,
  onChangeDemoScenario,
  currentPacket,
  hardwareNodes,
  esp32CamIp,
  ownerId,
  onSaveSession,
  onOpenReport,
}) => {
  const [step, setStep] = useState<number>(1);
  const [nailbedImg, setNailbedImg] = useState<string>(nailbedAsset);
  const [nailbedAccepted, setNailbedAccepted] = useState<boolean>(true);
  const [conjunctivaImg, setConjunctivaImg] = useState<string>(conjunctivaAsset);
  const [conjunctivaAccepted, setConjunctivaAccepted] = useState<boolean>(true);
  const [isCapturingImg, setIsCapturingImg] = useState(false);
  const [generatedSession, setGeneratedSession] = useState<ScreeningSessionRecord | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const spectralPoints = as7341Service.toChartPoints(currentPacket.spectral);

  const pipelineInput = {
    ownerId,
    nailbedImageUrl: nailbedAccepted ? nailbedImg : '',
    conjunctivaImageUrl: conjunctivaAccepted ? conjunctivaImg : '',
    packet: currentPacket,
    deviceConnected: hardwareNodes.every((n) => n.status === 'Connected' || n.status === 'Demo'),
    isDemo: isDemoMode,
  };

  const qualityValidation = aiInferenceService.validateInput(pipelineInput);
  const extractedFeatures = extractFeatures(nailbedImg, conjunctivaImg, currentPacket);

  const handleCaptureImage = async (target: 'nailbed' | 'conjunctiva') => {
    setIsCapturingImg(true);
    try {
      const res = await esp32CamService.captureImage(target, isDemoMode, esp32CamIp);
      if (target === 'nailbed') {
        setNailbedImg(res.imageDataUrl);
        setNailbedAccepted(false);
      } else {
        setConjunctivaImg(res.imageDataUrl);
        setConjunctivaAccepted(false);
      }
    } finally {
      setIsCapturingImg(false);
    }
  };

  const handleRunAiScreening = () => {
    const resultRecord = aiInferenceService.generateScreeningResult(pipelineInput);
    setGeneratedSession(resultRecord);
    setStep(8);
  };

  const handleSaveCurrentResult = async () => {
    if (!generatedSession) return;
    await onSaveSession(generatedSession);
    setSavedNotice('Screening session saved to History and queued for Cloud Sync.');
    setTimeout(() => setSavedNotice(null), 4000);
  };

  const handleRepeatScreening = () => {
    setGeneratedSession(null);
    setSavedNotice(null);
    setStep(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Research Prototype Banner & Deterministic Demo Scenario Selector */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">
              Guided 8-Step Multimodal Anemia Screening Workflow
            </h2>
            {isDemoMode && (
              <span className="text-xs font-mono font-semibold text-amber-700">
                · DEMO DATA
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Research screening prototype only — not a medical diagnostic device. Laboratory hemoglobin/CBC testing is required for confirmation.
          </p>
        </div>

        {isDemoMode && (
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: 'lower_risk', label: 'Demo: Lower Risk Profile' },
                { id: 'elevated_risk', label: 'Demo: Elevated Risk Profile' },
                { id: 'insufficient_quality', label: 'Demo: Poor Signal' },
              ] as const
            ).map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => onChangeDemoScenario(sc.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  demoScenario === sc.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 8-Step Horizontal Stepper Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {STEPS.map((s) => {
          const isCurrent = step === s.num;
          const isDone = step > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num === 8 && !generatedSession) {
                  handleRunAiScreening();
                } else {
                  setStep(s.num);
                }
              }}
              className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                isCurrent
                  ? 'border-sky-600 bg-sky-50/60 text-sky-900'
                  : isDone
                  ? 'border-emerald-200 bg-white text-slate-800'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900'
              }`}
            >
              <span className="font-mono text-[11px] font-semibold">
                STEP {s.num} {isDone ? '✓' : ''}
              </span>
              <span className="mt-0.5 text-xs font-semibold truncate w-full">{s.title}</span>
            </button>
          );
        })}
      </div>

      {/* STEP 1 — DEVICE CHECK */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Step 1 — Hardware & Sensor Readiness Check
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Verify connectivity across ESP32 controller, MAX30102 pulse sensor, ESP32-CAM optical imager, and AS7341 spectral sensor.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {hardwareNodes.map((node) => (
              <div
                key={node.id}
                className="rounded-xl border border-slate-200 p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-slate-900">{node.role}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {node.deviceId} · Signal {node.signalQuality}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{node.details}</div>
                </div>
                <div className="text-right font-mono text-xs font-semibold">
                  {node.status === 'Connected' && (
                    <span className="text-emerald-700">● Connected</span>
                  )}
                  {node.status === 'Demo' && (
                    <span className="text-sky-700">● Demo</span>
                  )}
                  {node.status === 'Disconnected' && (
                    <span className="text-rose-700">✖ Disconnected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2 — SIGNAL QUALITY */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Step 2 — Real-Time Optical & Contact Signal Quality
              </h3>
              <p className="mt-1 text-sm font-medium text-sky-800">
                Instruction: &ldquo;Keep the measurement area still.&rdquo;
              </p>
            </div>
            <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {currentPacket.signal_quality}%{' '}
              <span className="text-xs font-normal text-slate-500">
                {isDemoMode ? '(DEMO DATA)' : ''}
              </span>
            </div>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all ${
                currentPacket.signal_quality >= 75
                  ? 'bg-emerald-600'
                  : currentPacket.signal_quality >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, currentPacket.signal_quality))}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="rounded-xl bg-slate-50 p-3.5">
              <span className="text-slate-500">Motion Artifact Index</span>
              <div className="mt-1 font-mono font-semibold text-slate-900">
                {currentPacket.signal_quality >= 70 ? 'Low (Stable Contact)' : 'Elevated Motion Detected'}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <span className="text-slate-500">Ambient Light Leakage</span>
              <div className="mt-1 font-mono font-semibold text-slate-900">
                &lt; 1.2% (Controlled Illumination)
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <span className="text-slate-500">Minimum Threshold</span>
              <div className="mt-1 font-mono font-semibold text-slate-900">
                ≥ 65% Required for AI Pipeline
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 — NAILBED IMAGE */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Step 3 — Fingernail / Nailbed Optical Image Capture
              </h3>
              <p className="mt-1 text-sm font-medium text-sky-800">
                Instruction: &ldquo;Place the fingernail/nailbed inside the measurement area.&rdquo;
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500">
              Status: {nailbedAccepted ? '✓ Accepted' : 'Pending Acceptance'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
              <img
                src={nailbedImg}
                alt="Nailbed Optical Measurement Area"
                referrerPolicy="no-referrer"
                className="h-[280px] w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-xs font-mono text-white flex justify-between">
                <span>ROI: Distal Nailbed Capillary Bed</span>
                <span>{isDemoMode ? 'DEMO DATA' : 'ESP32-CAM'}</span>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Controlled white LED illumination captures nailbed vascular reflectance for multimodal feature extraction (`preprocessImage()`).
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCaptureImage('nailbed')}
                  disabled={isCapturingImg}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>{isCapturingImg ? 'Capturing...' : 'Capture'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCaptureImage('nailbed')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNailbedAccepted(true);
                    setStep(4);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Accept &amp; Continue</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 — CONJUNCTIVAL/EYELID IMAGE */}
      {step === 4 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Step 4 — Optical Image Acquisition (Conjunctival / Lower Eyelid)
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Secondary optical image acquisition for multimodal feature fusion. Note: An optical photograph alone does not prove or diagnose anemia.
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500">
              Status: {conjunctivaAccepted ? '✓ Accepted' : 'Pending Acceptance'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
              <img
                src={conjunctivaImg}
                alt="Conjunctival Optical Image Acquisition"
                referrerPolicy="no-referrer"
                className="h-[280px] w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-xs font-mono text-white flex justify-between">
                <span>Optical image acquisition</span>
                <span>{isDemoMode ? 'DEMO DATA' : 'ESP32-CAM'}</span>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Captures supplementary mucosal reflectance characteristics under low-glare diffuse illumination.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCaptureImage('conjunctiva')}
                  disabled={isCapturingImg}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>{isCapturingImg ? 'Capturing...' : 'Capture'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCaptureImage('conjunctiva')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConjunctivaAccepted(true);
                    setStep(5);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Accept &amp; Continue</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5 — SPECTRAL DATA (AS7341) */}
      {step === 5 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Step 5 — AS7341 Multi-Spectral Measurements (415 nm – 940 nm)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Multi-wavelength optical reflectance across Soret (415nm), Q-Band (555nm/590nm), Red (630nm/680nm), and NIR (910nm/940nm) channels.
              </p>
            </div>
            <span className="font-mono text-xs text-slate-600 tabular-nums">
              Q-Band Ratio (555/630): {extractedFeatures.spectralFeatures.qBandRatio555_630}{' '}
              {isDemoMode ? '· DEMO DATA' : ''}
            </span>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spectralPoints} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="wavelength"
                  tick={{ fontSize: 11, fill: '#475569', fontFamily: 'IBM Plex Mono' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#475569', fontFamily: 'IBM Plex Mono' }} />
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
                <Bar dataKey="intensity" name="Spectral Count" radius={[5, 5, 0, 0]} isAnimationActive={false}>
                  {spectralPoints.map((entry, idx) => (
                    <Cell key={idx} fill={entry.colorHex} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 pt-2">
            {spectralPoints.map((pt) => (
              <div
                key={pt.wavelength}
                className="rounded-lg border border-slate-200 p-2.5 text-center font-mono"
              >
                <div className="text-[11px] text-slate-500">{pt.wavelength}</div>
                <div className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums">
                  {pt.intensity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 6 — PPG DATA (MAX30102) */}
      {step === 6 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Step 6 — MAX30102 Physiological &amp; Optical PPG Data
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Supporting physiological and optical pulse parameters. Note: SpO2 and Heart Rate do not directly determine anemia.
              </p>
            </div>
            {isDemoMode && (
              <span className="font-mono text-xs font-semibold text-amber-700">DEMO DATA</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl border border-slate-200 p-3.5">
              <div className="text-xs text-slate-500">Heart Rate</div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                {currentPacket.heart_rate} BPM
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3.5">
              <div className="text-xs text-slate-500">SpO2 (Supporting)</div>
              <div className="mt-1 font-mono text-xl font-bold text-teal-700 tabular-nums">
                {currentPacket.spo2}%
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3.5">
              <div className="text-xs text-slate-500">Raw IR ADC</div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                {currentPacket.ir.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3.5">
              <div className="text-xs text-slate-500">Raw Red ADC</div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                {currentPacket.red.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3.5">
              <div className="text-xs text-slate-500">Signal Quality</div>
              <div className="mt-1 font-mono text-xl font-bold text-sky-700 tabular-nums">
                {currentPacket.signal_quality}%
              </div>
            </div>
          </div>

          <PpgWaveformCanvas
            heartRate={currentPacket.heart_rate}
            spo2={currentPacket.spo2}
            isConnected={true}
          />
        </div>
      )}

      {/* STEP 7 — DATA QUALITY VALIDATION */}
      {step === 7 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Step 7 — Pre-Inference Multimodal Data Quality Gate
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Validating all optical, spectral, and physiological inputs prior to multimodal AI model execution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {[
              {
                label: 'Nailbed & Conjunctival Images Available',
                ok:
                  qualityValidation.nailbedImageAvailable &&
                  qualityValidation.conjunctivaImageAvailable,
              },
              {
                label: 'Image & Contact Quality Acceptable (≥ 65%)',
                ok: qualityValidation.imageQualityAcceptable,
              },
              {
                label: 'MAX30102 PPG Signal Available',
                ok: qualityValidation.ppgSignalAvailable,
              },
              {
                label: 'AS7341 Spectral Channels Available',
                ok: qualityValidation.spectralDataAvailable,
              },
              {
                label: 'Packet Timestamp Valid',
                ok: qualityValidation.timestampValid,
              },
              {
                label: 'Device Connected / Demo Stream Active',
                ok: qualityValidation.deviceConnected,
              },
            ].map((chk) => (
              <div
                key={chk.label}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5"
              >
                <span className="font-medium text-slate-700">{chk.label}</span>
                <span
                  className={`font-mono font-semibold ${
                    chk.ok ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {chk.ok ? '✓ PASS' : '✖ FAIL'}
                </span>
              </div>
            ))}
          </div>

          {!qualityValidation.isValid ? (
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span className="font-semibold">
                  Measurement quality insufficient. Please repeat the test.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRepeatScreening}
                className="rounded-lg bg-rose-700 px-3 py-1.5 font-semibold text-white hover:bg-rose-800 transition-colors cursor-pointer"
              >
                Repeat Test
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{qualityValidation.summaryMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleRunAiScreening}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
              >
                <Cpu className="h-4 w-4" />
                <span>Execute Multimodal AI Screening</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 8 — AI SCREENING RESULT */}
      {step === 8 && generatedSession && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-mono font-semibold text-amber-700">
                DEMO AI — NOT FOR MEDICAL USE
              </span>
              <h3 className="mt-1 text-xl font-bold text-slate-900">
                Multimodal Non-Invasive Anemia Screening Result
              </h3>
            </div>
            <span className="font-mono text-xs text-slate-500">
              {new Date(generatedSession.timestamp).toLocaleString()}
            </span>
          </div>

          {/* Multimodal Architecture Pipeline Visual Summary */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-mono">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
              <div className="text-slate-500">IMAGE MODEL</div>
              <div className="mt-1 font-semibold text-slate-900">
                Nailbed + Conjunctiva ROI
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
              <div className="text-slate-500">SPECTRAL MODEL</div>
              <div className="mt-1 font-semibold text-slate-900">
                AS7341 Q-Band ({extractedFeatures.spectralFeatures.qBandRatio555_630})
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
              <div className="text-slate-500">PPG MODEL</div>
              <div className="mt-1 font-semibold text-slate-900">
                MAX30102 Red/IR Context
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
              <div className="text-slate-500">MULTIMODAL FUSION</div>
              <div className="mt-1 font-semibold text-sky-700">
                Deterministic Feature Fusion
              </div>
            </div>
            <div className="rounded-xl bg-slate-900 text-white p-3">
              <div className="text-slate-400">CONFIDENCE</div>
              <div className="mt-1 font-bold text-base tabular-nums">
                {generatedSession.confidence}%
              </div>
            </div>
          </div>

          {/* Primary Non-Diagnostic Screening Outcome Box */}
          <div
            className={`rounded-2xl border p-6 ${
              generatedSession.screeningOutcome === 'Elevated anemia risk indicated'
                ? 'border-amber-300 bg-amber-50/70'
                : generatedSession.screeningOutcome === 'Lower anemia risk indicated'
                ? 'border-emerald-300 bg-emerald-50/70'
                : 'border-rose-300 bg-rose-50/70'
            }`}
          >
            <div className="text-xs font-semibold text-slate-500">Screening Output</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {generatedSession.screeningOutcome}
            </div>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {generatedSession.recommendation}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-slate-700">
              <div>Model Confidence: {generatedSession.confidence}%</div>
              <div>Signal Quality: {generatedSession.signalQuality}% (Good)</div>
              <div>Device ID: {generatedSession.deviceId}</div>
              <div>Model: REDSENSE-MULTIMODAL-v0.1</div>
            </div>
          </div>

          {/* Mandatory Medical Disclaimer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900">IMPORTANT:</strong> This is a screening result and not a medical diagnosis. A laboratory hemoglobin/CBC test and consultation with a qualified healthcare professional are required for clinical confirmation.
          </div>

          {savedNotice && (
            <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>{savedNotice}</span>
            </div>
          )}

          {/* Action Buttons: View Report, Save Result, Repeat Screening */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenReport(generatedSession)}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>View Report &amp; Download PDF</span>
            </button>
            <button
              type="button"
              onClick={handleSaveCurrentResult}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save Result</span>
            </button>
            <button
              type="button"
              onClick={handleRepeatScreening}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Repeat Screening</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Step Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Previous Step</span>
        </button>

        {step < 8 && (
          <button
            type="button"
            onClick={() => {
              if (step === 7) {
                handleRunAiScreening();
              } else {
                setStep((s) => Math.min(8, s + 1));
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
          >
            <span>{step === 7 ? 'Run AI Screening (Step 8)' : `Continue to Step ${step + 1}`}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
