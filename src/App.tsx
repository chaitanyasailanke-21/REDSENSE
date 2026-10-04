import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FlaskConical,
  Cpu,
  Activity,
  Camera,
  History,
  FileText,
  User as UserIcon,
  Settings,
  Heart,
  Wind,
  Radio,
  Microscope,
  Play,
  AlertTriangle,
  ArrowRight,
  Cloud,
} from 'lucide-react';
import {
  auth,
  db,
  onAuthStateChanged,
  collection,
  query,
  where,
  onSnapshot,
  handleFirestoreError,
  OperationType,
  User,
} from './firebase';
import {
  CameraCaptureItem,
  Esp32SensorPacket,
  RedsenseHardwareConfig,
  ScreeningOutcome,
  ScreeningSessionRecord,
} from './models/redsenseTypes';
import { mockHardwareService } from './hardware/mockHardwareService';
import { storageService } from './services/storageService';
import { firebaseService } from './services/firebaseService';
import { ScreeningWorkflowPage } from './pages/ScreeningWorkflowPage';
import { DevicesPage } from './pages/DevicesPage';
import { LiveDataPage, LiveTelemetryHistoryItem } from './pages/LiveDataPage';
import { CameraPage } from './pages/CameraPage';
import { HistoryReportsPage } from './pages/HistoryReportsPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';

type SectionId =
  | 'dashboard'
  | 'screening'
  | 'devices'
  | 'livedata'
  | 'camera'
  | 'history'
  | 'reports'
  | 'profile'
  | 'settings';

const NAV_ITEMS: Array<{
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'screening', label: 'Screening', icon: FlaskConical },
  { id: 'devices', label: 'Devices', icon: Cpu },
  { id: 'livedata', label: 'Live Data', icon: Activity },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'history', label: 'History', icon: History },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Hardware & Demo Mode Configuration
  const [config, setConfig] = useState<RedsenseHardwareConfig>(() =>
    storageService.loadHardwareConfig()
  );
  const isDemoMode = config.communicationMode === 'DEMO';

  // Live ESP32 Sensor Packet & Stream Window
  const [currentPacket, setCurrentPacket] = useState<Esp32SensorPacket>(() =>
    mockHardwareService.generatePacket(config.demoScenario)
  );
  const [streamHistory, setStreamHistory] = useState<LiveTelemetryHistoryItem[]>(() => {
    const now = Date.now();
    return Array.from({ length: 14 }, (_, idx) => {
      const t = new Date(now - (13 - idx) * 2000);
      return {
        timeLabel: t.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
        heartRate: 77 + (idx % 3),
        spo2: 98,
        signalQuality: 92,
        ir: 123456,
        red: 98765,
      };
    });
  });

  // Screening Sessions & Optical Captures (Local Storage + Cloud Firestore Sync)
  const [sessions, setSessions] = useState<ScreeningSessionRecord[]>(() =>
    storageService.loadSessions()
  );
  const [selectedReportSession, setSelectedReportSession] =
    useState<ScreeningSessionRecord | null>(null);
  const [captures, setCaptures] = useState<CameraCaptureItem[]>(() =>
    storageService.loadCaptures()
  );

  // Firebase Auth & Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'Offline' | 'Syncing' | 'Synced'>('Offline');

  // Persist hardware config changes locally
  const handleUpdateConfig = (next: RedsenseHardwareConfig) => {
    setConfig(next);
    storageService.saveHardwareConfig(next);
  };

  const handleToggleDemoMode = () => {
    const nextMode = isDemoMode ? 'Wi-Fi' : 'DEMO';
    handleUpdateConfig({ ...config, communicationMode: nextMode });
  };

  // 1. Firebase Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
      setSyncStatus(user && user.emailVerified ? 'Synced' : 'Offline');
    });
    return () => unsub();
  }, []);

  // 2. Firestore Real-Time Screening Sessions Listener
  useEffect(() => {
    if (!isAuthReady || !currentUser || !currentUser.emailVerified) {
      return;
    }

    setSyncStatus('Syncing');
    const q = query(
      collection(db, 'screening_sessions'),
      where('ownerId', '==', currentUser.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSyncStatus('Synced');
        if (snap.empty) return;
        const cloudSessions: ScreeningSessionRecord[] = snap.docs
          .map((d) => {
            const data = d.data();
            const existingLocal = storageService
              .loadSessions()
              .find((loc) => loc.id === d.id);
            return {
              id: d.id,
              ownerId: String(data.ownerId || currentUser.uid),
              timestamp: Number(data.recordedAtMs || Date.now()),
              deviceId: String(data.deviceId || 'REDSENSE-ESP32-001'),
              heartRate: Number(data.heartRate || 78),
              spo2: Number(data.spo2 || 98),
              signalQuality: Number(data.signalQuality || 92),
              irRaw: Number(data.irRaw || 123456),
              redRaw: Number(data.redRaw || 98765),
              spectral: existingLocal?.spectral || {
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
              },
              nailbedImageUrl:
                existingLocal?.nailbedImageUrl ||
                storageService.loadSessions()[0]?.nailbedImageUrl ||
                '',
              conjunctivaImageUrl:
                existingLocal?.conjunctivaImageUrl ||
                storageService.loadSessions()[0]?.conjunctivaImageUrl ||
                '',
              screeningOutcome: (data.screeningOutcome ||
                'Lower anemia risk indicated') as ScreeningOutcome,
              recommendation:
                existingLocal?.recommendation ||
                'Clinical confirmation recommended. Laboratory hemoglobin/CBC testing is required.',
              confidence: Number(data.confidence || 86),
              modelVersion: String(
                data.modelVersion || 'REDSENSE-MULTIMODAL-v0.1 (DEMO AI)'
              ),
              isDemo: Boolean(data.isDemo ?? true),
              dataSourcesUsed: existingLocal?.dataSourcesUsed || [
                'Nailbed Optical ROI (ESP32-CAM)',
                'Conjunctival Optical Acquisition (ESP32-CAM)',
                'AS7341 415nm–940nm Spectral Reflectance',
                'MAX30102 Dual-Wavelength PPG Supporting Stream',
              ],
              notes: String(data.notes || ''),
            };
          })
          .sort((a, b) => b.timestamp - a.timestamp);

        setSessions(cloudSessions);
        storageService.saveSessions(cloudSessions);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'screening_sessions');
      }
    );

    return () => unsub();
  }, [isAuthReady, currentUser]);

  // 3. Simulated Demo Telemetry Stream
  useEffect(() => {
    if (!isDemoMode) return;

    const interval = setInterval(() => {
      const nextPkt = mockHardwareService.generatePacket(config.demoScenario);
      setCurrentPacket(nextPkt);
      setStreamHistory((prev) => {
        const nextItem: LiveTelemetryHistoryItem = {
          timeLabel: new Date().toLocaleTimeString([], {
            minute: '2-digit',
            second: '2-digit',
          }),
          heartRate: nextPkt.heart_rate,
          spo2: nextPkt.spo2,
          signalQuality: nextPkt.signal_quality,
          ir: nextPkt.ir,
          red: nextPkt.red,
        };
        return [...prev.slice(-17), nextItem];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isDemoMode, config.demoScenario]);

  const hardwareNodes = mockHardwareService.getHardwareNodes(isDemoMode, !isDemoMode);
  const latestSession = sessions[0] || null;

  const handleSaveScreeningSession = async (newSession: ScreeningSessionRecord) => {
    const updated = [newSession, ...sessions.filter((s) => s.id !== newSession.id)];
    setSessions(updated);
    storageService.saveSessions(updated);

    if (currentUser && currentUser.emailVerified) {
      setSyncStatus('Syncing');
      const status = await firebaseService.syncScreeningSessionToCloud(
        currentUser,
        newSession
      );
      setSyncStatus(status);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    storageService.saveSessions(updated);
    await firebaseService.deleteSessionFromCloud(currentUser, sessionId);
  };

  const handleSaveCameraCapture = (
    capInput: Omit<CameraCaptureItem, 'id' | 'ownerId' | 'timestamp'>
  ) => {
    const item: CameraCaptureItem = {
      ...capInput,
      id: `cap_${Date.now()}`,
      ownerId: currentUser?.uid || 'demo_user',
      timestamp: Date.now(),
    };
    const updated = [item, ...captures];
    setCaptures(updated);
    storageService.saveCaptures(updated);
  };

  const handleDeleteCameraCapture = (id: string) => {
    const updated = captures.filter((c) => c.id !== id);
    setCaptures(updated);
    storageService.saveCaptures(updated);
  };

  const subjectDisplayName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Research Participant';

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
      }`}
    >
      {/* Desktop / Tablet Sidebar Navigation */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 bg-white z-30 justify-between">
        <div>
          <div className="px-6 py-5 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setActiveSection('dashboard')}
              className="text-left cursor-pointer"
            >
              <div className="text-lg font-bold tracking-tight text-slate-900">
                REDSENSE
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                Non-Invasive Anemia Screening
              </div>
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSelected = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Mode & Developer Attribution */}
        <div className="p-4 border-t border-slate-100 space-y-3 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5 text-sky-600" />
              <span>Sync: {syncStatus}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400">v0.1</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Developed by <strong className="text-slate-700">Chaitanya Sai</strong>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen pb-20 md:pb-0">
        {/* Top Bar Contract */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-xs px-5 py-3.5 sm:px-8">
          {/* Zone 1: Brand Title */}
          <button
            type="button"
            onClick={() => setActiveSection('dashboard')}
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap cursor-pointer"
          >
            REDSENSE
          </button>

          {/* Zone 2: Quick Section Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveSection('dashboard')}
              className={`hover:text-slate-900 transition-colors cursor-pointer ${
                activeSection === 'dashboard' ? 'text-sky-600 font-semibold' : ''
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('screening')}
              className={`hover:text-slate-900 transition-colors cursor-pointer ${
                activeSection === 'screening' ? 'text-sky-600 font-semibold' : ''
              }`}
            >
              Screening
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('livedata')}
              className={`hover:text-slate-900 transition-colors cursor-pointer ${
                activeSection === 'livedata' ? 'text-sky-600 font-semibold' : ''
              }`}
            >
              Live Data
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('history')}
              className={`hover:text-slate-900 transition-colors cursor-pointer ${
                activeSection === 'history' ? 'text-sky-600 font-semibold' : ''
              }`}
            >
              History
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('reports')}
              className={`hover:text-slate-900 transition-colors cursor-pointer ${
                activeSection === 'reports' ? 'text-sky-600 font-semibold' : ''
              }`}
            >
              Reports
            </button>
          </nav>

          {/* Zone 3: Mandatory DEMO MODE Switch + Start Screening CTA */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleDemoMode}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isDemoMode
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              <span>{isDemoMode ? 'DEMO MODE: ON' : 'HARDWARE MODE'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('screening')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>START SCREENING</span>
            </button>
          </div>
        </header>

        {/* Main Viewport Content */}
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-5 py-7 sm:px-8">
          {/* SECTION 1: DASHBOARD */}
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              {/* Non-Diagnostic Research Prototype Notice */}
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3.5 text-xs text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>RESEARCH &amp; SCREENING PROTOTYPE — NOT A MEDICAL DIAGNOSTIC DEVICE:</strong>{' '}
                  REDSENSE provides non-invasive multimodal screening indicators only. Laboratory hemoglobin/CBC testing and evaluation by a qualified healthcare professional are required for confirmation.
                </div>
              </div>

              {/* Dashboard Hero Header & Primary START SCREENING CTA */}
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      REDSENSE — Non-Invasive Anemia Screening
                    </h1>
                    {isDemoMode && (
                      <span className="font-mono text-xs font-semibold text-amber-700">
                        · DEMO DATA
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Good morning, <strong>{subjectDisplayName}</strong> · Developed by{' '}
                    <strong>Chaitanya Sai</strong> · Multimodal Optical, Spectral &amp; PPG Research Platform
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSection('screening')}
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-sky-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-sky-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>START SCREENING</span>
                </button>
              </div>

              {/* 4 Status Summary Strip Cards (Device Status, Screening Status, Latest Screening, Last Measurement) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium text-slate-500">Device Status</div>
                  <div className="mt-1.5 text-base font-bold text-slate-900">
                    {isDemoMode
                      ? '● Connected (DEMO DATA)'
                      : '● Hardware Mode Active'}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    {currentPacket.device_id}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium text-slate-500">Screening Status</div>
                  <div className="mt-1.5 text-base font-bold text-emerald-700">
                    Ready for Acquisition
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    8-Step Multimodal Pipeline
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium text-slate-500">Latest Screening</div>
                  <div className="mt-1.5 text-sm font-bold text-slate-900 line-clamp-1">
                    {latestSession
                      ? latestSession.screeningOutcome
                      : 'No sessions recorded'}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    {latestSession
                      ? `Confidence: ${latestSession.confidence}% · Clinical confirmation recommended`
                      : 'Run screening to generate'}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium text-slate-500">Last Measurement</div>
                  <div className="mt-1.5 font-mono text-base font-bold text-slate-900 tabular-nums">
                    {latestSession
                      ? new Date(latestSession.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Just now'}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    Model: REDSENSE-MULTIMODAL-v0.1
                  </div>
                </div>
              </div>

              {/* 5 Required Sensor Cards: Heart Rate, SpO2, Signal Quality, Spectral Sensor, Camera */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">
                    Live Hardware &amp; Sensor Channels
                  </h2>
                  <span className="text-xs text-slate-500">
                    Note: Supporting SpO2 and Heart Rate measurements do not directly determine anemia.
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {/* Card 1: Heart Rate */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Heart Rate</span>
                      <Heart className="h-4 w-4 text-sky-600" />
                    </div>
                    <div className="my-3 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {currentPacket.heart_rate}{' '}
                      <span className="text-xs font-normal text-slate-500">BPM</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      MAX30102 {isDemoMode ? '· DEMO DATA' : ''}
                    </div>
                  </div>

                  {/* Card 2: SpO2 */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">
                        SpO2 (Supporting)
                      </span>
                      <Wind className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="my-3 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {currentPacket.spo2}%
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Physiological Context {isDemoMode ? '· DEMO DATA' : ''}
                    </div>
                  </div>

                  {/* Card 3: Signal Quality */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">
                        Signal Quality
                      </span>
                      <Radio className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="my-3 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
                      {currentPacket.signal_quality >= 75 ? 'Good' : 'Fair'}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        ({currentPacket.signal_quality}%)
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Optical Contact Stability
                    </div>
                  </div>

                  {/* Card 4: Spectral Sensor */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">
                        Spectral Sensor
                      </span>
                      <Microscope className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="my-3 text-xl font-bold text-slate-900">
                      Connected
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      AS7341 (415nm–940nm) {isDemoMode ? '· DEMO' : ''}
                    </div>
                  </div>

                  {/* Card 5: Camera */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Camera</span>
                      <Camera className="h-4 w-4 text-sky-600" />
                    </div>
                    <div className="my-3 text-xl font-bold text-slate-900">
                      Connected
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      ESP32-CAM Optical {isDemoMode ? '· DEMO' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* End-to-End Multimodal Pipeline Architecture Overview */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      REDSENSE Multimodal Screening Pipeline Architecture
                    </h2>
                    <p className="text-xs text-slate-500">
                      Modular hardware-to-AI research pipeline enabling seamless transition from Demo Services to physical ESP32 + TensorFlow Lite / ONNX models.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('livedata')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline cursor-pointer"
                  >
                    <span>Inspect Live Streams</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs font-mono">
                  {[
                    { step: '01', name: 'HARDWARE', desc: 'MAX30102 · AS7341 · CAM' },
                    { step: '02', name: 'ESP32', desc: 'BLE / Wi-Fi JSON' },
                    { step: '03', name: 'ACQUISITION', desc: 'Nailbed + Conjunctiva' },
                    { step: '04', name: 'APPLICATION', desc: 'Quality Gate Check' },
                    { step: '05', name: 'PREPROCESS', desc: 'ROI & Q-Band Ratios' },
                    { step: '06', name: 'AI MODEL', desc: 'Multimodal Fusion' },
                    { step: '07', name: 'RESULT', desc: 'Risk Indicator Only' },
                    { step: '08', name: 'REPORT', desc: 'History · PDF · CSV' },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                    >
                      <div className="text-[10px] text-sky-700 font-bold">{item.step}</div>
                      <div className="mt-0.5 font-bold text-slate-900">{item.name}</div>
                      <div className="mt-1 text-[10px] text-slate-500 font-sans">
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: 8-STEP GUIDED SCREENING WORKFLOW */}
          {activeSection === 'screening' && (
            <ScreeningWorkflowPage
              isDemoMode={isDemoMode}
              demoScenario={config.demoScenario}
              onChangeDemoScenario={(sc) =>
                handleUpdateConfig({ ...config, demoScenario: sc })
              }
              currentPacket={currentPacket}
              hardwareNodes={hardwareNodes}
              esp32CamIp={config.esp32CamIp}
              ownerId={currentUser?.uid || 'demo_user'}
              onSaveSession={handleSaveScreeningSession}
              onOpenReport={(session) => {
                handleSaveScreeningSession(session);
                setSelectedReportSession(session);
                setActiveSection('reports');
              }}
            />
          )}

          {/* SECTION 3: DEVICES */}
          {activeSection === 'devices' && (
            <DevicesPage
              config={config}
              onUpdateConfig={handleUpdateConfig}
              hardwareNodes={hardwareNodes}
              currentPacket={currentPacket}
              onInjectPacket={(pkt) => setCurrentPacket(pkt)}
            />
          )}

          {/* SECTION 4: LIVE DATA */}
          {activeSection === 'livedata' && (
            <LiveDataPage
              isDemoMode={isDemoMode}
              currentPacket={currentPacket}
              streamHistory={streamHistory}
            />
          )}

          {/* SECTION 5: CAMERA (ESP32-CAM) */}
          {activeSection === 'camera' && (
            <CameraPage
              isDemoMode={isDemoMode}
              esp32CamIp={config.esp32CamIp}
              onUpdateCamIp={(ip) => handleUpdateConfig({ ...config, esp32CamIp: ip })}
              signalQuality={currentPacket.signal_quality}
              captures={captures}
              onSaveCapture={handleSaveCameraCapture}
              onDeleteCapture={handleDeleteCameraCapture}
            />
          )}

          {/* SECTION 6 & 7: HISTORY & REPORTS */}
          {(activeSection === 'history' || activeSection === 'reports') && (
            <HistoryReportsPage
              mode={activeSection}
              sessions={sessions}
              selectedSession={selectedReportSession}
              onSelectSession={setSelectedReportSession}
              onDeleteSession={handleDeleteSession}
              subjectName={subjectDisplayName}
            />
          )}

          {/* SECTION 8 & 9: PROFILE & SETTINGS (Plus Flutter Cross-Platform Project Studio) */}
          {(activeSection === 'profile' || activeSection === 'settings') && (
            <ProfileSettingsPage
              mode={activeSection}
              currentUser={currentUser}
              syncStatus={syncStatus}
              config={config}
              onUpdateConfig={handleUpdateConfig}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode((d) => !d)}
            />
          )}

          {/* Quiet Footer */}
          <footer className="mt-12 border-t border-slate-200 pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>REDSENSE Non-Invasive Anemia Screening Research Prototype · Developed by Chaitanya Sai</span>
            <span>Screening result only — not a medical diagnosis. Clinical confirmation required.</span>
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="grid grid-cols-5 items-center h-14">
          {(
            [
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'screening', label: 'Screening', icon: FlaskConical },
              { id: 'livedata', label: 'Live Data', icon: Activity },
              { id: 'history', label: 'History', icon: History },
              { id: 'settings', label: 'Settings', icon: Settings },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isSelected = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-sky-600 font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="mt-1 text-[10px] tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
