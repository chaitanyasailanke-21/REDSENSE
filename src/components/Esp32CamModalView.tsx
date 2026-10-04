import React, { useEffect, useRef, useState } from 'react';
import { Camera, Video, RefreshCw, Trash2, CheckCircle2, Wifi, Eye } from 'lucide-react';
import { CameraCapture, CaptureMode } from '../types/health';
import { scleraScanImg, hardwareRigImg } from '../data/initialReadings';

interface Esp32CamModalViewProps {
  currentHeartRate: number;
  currentSpo2: number;
  currentHemoglobin: number;
  captures: CameraCapture[];
  onSaveCapture: (capture: Omit<CameraCapture, 'id' | 'ownerId' | 'recordedAtMs'>) => Promise<void>;
  onDeleteCapture: (captureId: string) => Promise<void>;
}

const CAPTURE_MODES: CaptureMode[] = [
  'Sclera Hemoglobin Scan',
  'Fingertip PPG Optical',
  'MAX30102 Sensor Alignment',
];

export const Esp32CamModalView: React.FC<Esp32CamModalViewProps> = ({
  currentHeartRate,
  currentSpo2,
  currentHemoglobin,
  captures,
  onSaveCapture,
  onDeleteCapture,
}) => {
  const [selectedMode, setSelectedMode] = useState<CaptureMode>('Sclera Hemoglobin Scan');
  const [esp32Ip, setEsp32Ip] = useState('192.168.4.1:81');
  const [feedSource, setFeedSource] = useState<'simulated' | 'webcam' | 'httpStream'>('simulated');
  const [captureTitle, setCaptureTitle] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureSuccessMsg, setCaptureSuccessMsg] = useState<string | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const opticalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stop webcam when unmounting or switching feed source
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (feedSource === 'webcam') {
      setWebcamError(null);
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 640, height: 360 } })
        .then((stream) => {
          activeStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          setWebcamError('Device camera unavailable or permission denied. Falling back to ESP32-CAM simulator.');
          setFeedSource('simulated');
        });
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [feedSource]);

  // Draw live ESP32-CAM optical HUD & simulated frame on canvas
  useEffect(() => {
    const canvas = opticalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.src = selectedMode === 'MAX30102 Sensor Alignment' ? hardwareRigImg : scleraScanImg;

    let animId: number;
    let tick = 0;

    const drawHud = () => {
      tick += 1;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, w, h);

      if (selectedMode === 'Fingertip PPG Optical') {
        // Render glowing 660nm Red LED transillumination through fingertip tissue
        const pulseRadius = 110 + Math.sin(tick * 0.12) * 14;
        const grad = ctx.createRadialGradient(w / 2, h / 2, 12, w / 2, h / 2, pulseRadius * 1.7);
        grad.addColorStop(0, '#FCA5A5');
        grad.addColorStop(0.35, '#DC2626');
        grad.addColorStop(0.75, '#7F1D1D');
        grad.addColorStop(1, '#0F172A');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Dermal capillary micro-ridges
        ctx.strokeStyle = 'rgba(254, 202, 202, 0.18)';
        ctx.lineWidth = 1.5;
        for (let r = 24; r < 150; r += 14) {
          ctx.beginPath();
          ctx.arc(w / 2, h / 2 + 25, r, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        }
      } else if (baseImg.complete && baseImg.naturalWidth > 0) {
        ctx.drawImage(baseImg, 0, 0, w, h);
      }

      // Contrast scrim at top and bottom for clinical telemetry legibility
      const topScrim = ctx.createLinearGradient(0, 0, 0, 64);
      topScrim.addColorStop(0, 'rgba(15, 23, 42, 0.82)');
      topScrim.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = topScrim;
      ctx.fillRect(0, 0, w, 64);

      const botScrim = ctx.createLinearGradient(0, h - 72, 0, h);
      botScrim.addColorStop(0, 'rgba(15, 23, 42, 0)');
      botScrim.addColorStop(1, 'rgba(15, 23, 42, 0.88)');
      ctx.fillStyle = botScrim;
      ctx.fillRect(0, h - 72, w, 72);

      // Optical ROI targeting reticle
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 1.5;
      const rx = w / 2 - 90;
      const ry = h / 2 - 60;
      const rw = 180;
      const rh = 120;
      ctx.strokeRect(rx, ry, rw, rh);

      // Scanning laser line inside ROI
      const scanY = ry + ((tick * 1.6) % rh);
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.75)';
      ctx.beginPath();
      ctx.moveTo(rx, scanY);
      ctx.lineTo(rx + rw, scanY);
      ctx.stroke();

      // Top & Bottom HUD text
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillText(`ESP32-CAM OV2640  ·  ${selectedMode}`, 16, 26);
      ctx.fillStyle = '#38BDF8';
      ctx.fillText(`ROI LOCKED`, w - 104, 26);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '500 12px "IBM Plex Mono", monospace';
      ctx.fillText(
        `Est. Hb: ${currentHemoglobin.toFixed(1)} g/dL   ·   SpO2: ${currentSpo2.toFixed(1)}%   ·   HR: ${currentHeartRate} BPM`,
        16,
        h - 18
      );

      animId = requestAnimationFrame(drawHud);
    };

    drawHud();
    return () => cancelAnimationFrame(animId);
  }, [selectedMode, currentHeartRate, currentSpo2, currentHemoglobin]);

  const handleCaptureStill = async () => {
    setIsCapturing(true);
    setCaptureSuccessMsg(null);
    try {
      let dataUrl = scleraScanImg;

      if (feedSource === 'webcam' && videoRef.current) {
        const offscreen = document.createElement('canvas');
        offscreen.width = 480;
        offscreen.height = 270;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, offscreen.width, offscreen.height);
          dataUrl = offscreen.toDataURL('image/jpeg', 0.72);
        }
      } else if (opticalCanvasRef.current) {
        dataUrl = opticalCanvasRef.current.toDataURL('image/jpeg', 0.72);
      }

      const defaultTitle =
        captureTitle.trim() ||
        `${selectedMode} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;

      await onSaveCapture({
        title: defaultTitle.slice(0, 120),
        captureMode: selectedMode,
        resolution: '640x360 HVGA (OV2640)',
        estimatedHb: Number(currentHemoglobin.toFixed(1)),
        spo2AtCapture: Number(currentSpo2.toFixed(1)),
        heartRateAtCapture: Math.round(currentHeartRate),
        imageDataUrl: dataUrl,
      });

      setCaptureTitle('');
      setCaptureSuccessMsg('Still frame captured and synced to records.');
      setTimeout(() => setCaptureSuccessMsg(null), 4000);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            ESP32-CAM Live Optical Stream & Still Image Capture
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Non-invasive conjunctiva hemoglobin screening, fingertip PPG transillumination, and MAX30102 optical alignment.
          </p>
        </div>

        {/* Feed Source Selector */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setFeedSource('simulated')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              feedSource === 'simulated'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ESP32-CAM Simulator
          </button>
          <button
            type="button"
            onClick={() => setFeedSource('webcam')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              feedSource === 'webcam'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Device Camera
          </button>
          <button
            type="button"
            onClick={() => setFeedSource('httpStream')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              feedSource === 'httpStream'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Direct IP Stream
          </button>
        </div>
      </div>

      {webcamError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          {webcamError}
        </div>
      )}

      {/* Main Split Stage: Live Feed on Left, Capture Parameters on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4">
          {/* Mode Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100 p-1">
            {CAPTURE_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSelectedMode(mode)}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedMode === mode
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Camera Viewport */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
            {feedSource === 'webcam' ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-[340px] w-full object-cover"
              />
            ) : feedSource === 'httpStream' ? (
              <div className="relative flex h-[340px] w-full flex-col items-center justify-center p-6 text-center">
                <img
                  src={`http://${esp32Ip}/stream`}
                  alt="ESP32-CAM Direct MJPEG Stream"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <Wifi className="h-8 w-8 text-sky-400 mb-2" />
                <p className="text-sm font-medium text-white">
                  Connecting to ESP32-CAM MJPEG Server at http://{esp32Ip}/stream
                </p>
                <p className="mt-1 max-w-md text-xs text-slate-400">
                  Ensure your mobile device or browser is connected to the ESP32 Access Point or local LAN subnet.
                </p>
              </div>
            ) : null}

            <canvas
              ref={opticalCanvasRef}
              width={640}
              height={360}
              className={`h-[340px] w-full object-cover ${
                feedSource === 'simulated' ? 'block' : 'hidden'
              }`}
            />
          </div>
        </div>

        {/* Capture Controls & Biomarker Stamp */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6">
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Optical Frame & Biomarker Stamp
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Each captured still image is stamped with simultaneous MAX30102 oximetry and optical hemoglobin readings.
              </p>
            </div>

            <div className="space-y-3 border-y border-slate-100 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">ESP32-CAM Stream Host</span>
                <input
                  type="text"
                  value={esp32Ip}
                  onChange={(e) => setEsp32Ip(e.target.value)}
                  className="w-44 rounded-lg border border-slate-200 px-2.5 py-1 text-right font-mono text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Estimated Hemoglobin (Hb)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {currentHemoglobin.toFixed(1)} g/dL
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Simultaneous SpO2 / HR</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {currentSpo2.toFixed(1)}% · {Math.round(currentHeartRate)} BPM
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Frame Clinical Annotation (Optional)
              </label>
              <input
                type="text"
                value={captureTitle}
                onChange={(e) => setCaptureTitle(e.target.value)}
                placeholder={`e.g. ${selectedMode} - Patient Right Eye`}
                maxLength={120}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {captureSuccessMsg && (
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{captureSuccessMsg}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleCaptureStill}
              disabled={isCapturing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Camera className="h-4 w-4" />
              <span>{isCapturing ? 'Capturing Frame...' : 'Capture Still Image & Sync'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stored Captures Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            Stored Diagnostic Captures ({captures.length})
          </h3>
          <span className="text-xs text-slate-500">
            Synced with local storage & Cloud Firestore
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {captures.map((cap) => (
            <div
              key={cap.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full bg-slate-900">
                  <img
                    src={cap.imageDataUrl}
                    alt={cap.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">
                    {cap.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {cap.captureMode} · {new Date(cap.recordedAtMs).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <p className="mt-2 font-mono text-xs text-slate-700 tabular-nums">
                    Hb {cap.estimatedHb.toFixed(1)} g/dL · SpO2 {cap.spo2AtCapture.toFixed(1)}% · {cap.heartRateAtCapture} BPM
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
                <span className="text-xs text-slate-400 font-mono">{cap.resolution}</span>
                <button
                  type="button"
                  onClick={() => onDeleteCapture(cap.id)}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
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
