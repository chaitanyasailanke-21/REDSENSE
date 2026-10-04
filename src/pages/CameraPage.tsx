import React, { useState } from 'react';
import { Camera, RefreshCw, CheckCircle2, Save, Trash2, Wifi } from 'lucide-react';
import { CameraCaptureItem } from '../models/redsenseTypes';
import { esp32CamService, nailbedAsset, conjunctivaAsset } from '../hardware/esp32CamService';

interface CameraPageProps {
  isDemoMode: boolean;
  esp32CamIp: string;
  onUpdateCamIp: (ip: string) => void;
  signalQuality: number;
  captures: CameraCaptureItem[];
  onSaveCapture: (cap: Omit<CameraCaptureItem, 'id' | 'ownerId' | 'timestamp'>) => void;
  onDeleteCapture: (id: string) => void;
}

export const CameraPage: React.FC<CameraPageProps> = ({
  isDemoMode,
  esp32CamIp,
  onUpdateCamIp,
  signalQuality,
  captures,
  onSaveCapture,
  onDeleteCapture,
}) => {
  const [targetRegion, setTargetRegion] = useState<
    'Nailbed Optical Capture' | 'Conjunctival Optical Acquisition'
  >('Nailbed Optical Capture');
  const [previewUrl, setPreviewUrl] = useState<string>(nailbedAsset);
  const [isAccepted, setIsAccepted] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const handleConnectCamera = async () => {
    const res = await esp32CamService.connectCamera(esp32CamIp, isDemoMode);
    setStatusNotice(res.message);
  };

  const handleCapture = async () => {
    const target = targetRegion === 'Nailbed Optical Capture' ? 'nailbed' : 'conjunctiva';
    const res = await esp32CamService.captureImage(target, isDemoMode, esp32CamIp);
    setPreviewUrl(res.imageDataUrl);
    setIsAccepted(false);
    setStatusNotice(`Captured ${targetRegion} frame (${res.resolution}).`);
  };

  const handleSave = () => {
    onSaveCapture({
      title: `${targetRegion} (${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })})`,
      targetRegion,
      imageDataUrl: previewUrl,
      resolution: isDemoMode ? '1600x1200 UXGA (DEMO DATA)' : '1600x1200 UXGA (ESP32-CAM)',
      signalQuality,
      isDemo: isDemoMode,
    });
    setIsAccepted(true);
    setStatusNotice('Optical capture accepted and saved to local & cloud storage.');
  };

  return (
    <div className="space-y-8">
      {/* Header & IP Configuration */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              ESP32-CAM Optical Image Acquisition
            </h2>
            {isDemoMode && (
              <span className="font-mono text-xs font-semibold text-amber-700">
                · DEMO DATA
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Acquire nailbed and conjunctival optical images via ESP32-CAM HTTP API (`GET /capture` &amp; `GET /stream`). Note: Optical images alone do not diagnose anemia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
            <Wifi className="h-3.5 w-3.5 text-sky-600" />
            <span className="text-xs text-slate-500">ESP32-CAM IP:</span>
            <input
              type="text"
              value={esp32CamIp}
              onChange={(e) => onUpdateCamIp(e.target.value)}
              placeholder="192.168.1.100"
              className="w-32 font-mono text-xs text-slate-900 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleConnectCamera}
            className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Connect Camera
          </button>
        </div>
      </div>

      {statusNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900">
          <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Main Camera Preview & Acquisition Controls */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                'Nailbed Optical Capture',
                'Conjunctival Optical Acquisition',
              ] as const
            ).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setTargetRegion(mode);
                  setPreviewUrl(
                    mode === 'Nailbed Optical Capture' ? nailbedAsset : conjunctivaAsset
                  );
                }}
                className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  targetRegion === mode
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
            <img
              src={previewUrl}
              alt={targetRegion}
              referrerPolicy="no-referrer"
              className="h-[320px] w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-center justify-between text-xs font-mono text-white">
              <span>{targetRegion}</span>
              <span>
                {isDemoMode
                  ? 'DEMO DATA'
                  : `http://${esp32CamIp}/capture`}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Acquisition Controls
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {targetRegion === 'Nailbed Optical Capture'
                ? 'Instruction: "Place the fingernail/nailbed inside the measurement area." Ensure steady contact and uniform LED illumination.'
                : 'Optical image acquisition of lower palpebral conjunctiva. Keep the camera steady inside the target frame.'}
            </p>

            <div className="space-y-2 border-y border-slate-100 py-3.5 text-xs font-mono text-slate-600">
              <div className="flex justify-between">
                <span>Stream Endpoint</span>
                <span>{esp32CamService.getCameraStream(esp32CamIp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Capture Endpoint</span>
                <span>{esp32CamService.getCaptureEndpoint(esp32CamIp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Signal / Illumination Quality</span>
                <span>{signalQuality}%</span>
              </div>
              <div className="flex justify-between">
                <span>Frame Status</span>
                <span>{isAccepted ? 'Accepted & Saved' : 'Preview Ready'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCapture}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
            >
              <Camera className="h-4 w-4" />
              <span>Capture</span>
            </button>
            <button
              type="button"
              onClick={handleCapture}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retake</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAccepted(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Accept</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save Frame</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stored Captures Gallery */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900">
          Saved Optical Captures ({captures.length})
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {captures.map((cap) => (
            <div
              key={cap.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white flex flex-col justify-between"
            >
              <div>
                <img
                  src={cap.imageDataUrl}
                  alt={cap.title}
                  referrerPolicy="no-referrer"
                  className="h-44 w-full object-cover"
                />
                <div className="p-4">
                  <div className="text-xs font-mono text-slate-500">
                    {cap.targetRegion} {cap.isDemo ? '· DEMO DATA' : ''}
                  </div>
                  <h4 className="mt-0.5 text-sm font-semibold text-slate-900">
                    {cap.title}
                  </h4>
                  <p className="mt-1 text-xs font-mono text-slate-500">
                    {new Date(cap.timestamp).toLocaleString()} · Signal {cap.signalQuality}%
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs">
                <span className="font-mono text-slate-400">{cap.resolution}</span>
                <button
                  type="button"
                  onClick={() => onDeleteCapture(cap.id)}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
