import JSZip from 'jszip';
import readmeRaw from '../../README.md?raw';
import pubspecRaw from '../../flutter_ezecheck/pubspec.yaml?raw';
import mainDartRaw from '../../flutter_ezecheck/lib/main.dart?raw';
import healthReadingDartRaw from '../../flutter_ezecheck/lib/models/health_reading.dart?raw';
import esp32ServiceDartRaw from '../../flutter_ezecheck/lib/services/esp32_connectivity_service.dart?raw';
import aiServiceDartRaw from '../../flutter_ezecheck/lib/services/ai_inference_service.dart?raw';
import firebaseSyncDartRaw from '../../flutter_ezecheck/lib/services/firebase_sync_service.dart?raw';
import exportServiceDartRaw from '../../flutter_ezecheck/lib/services/export_service.dart?raw';
import dashboardScreenDartRaw from '../../flutter_ezecheck/lib/screens/dashboard_screen.dart?raw';
import screeningWorkflowDartRaw from '../../flutter_ezecheck/lib/screens/screening_workflow_screen.dart?raw';
import connectivityScreenDartRaw from '../../flutter_ezecheck/lib/screens/connectivity_screen.dart?raw';
import chartsScreenDartRaw from '../../flutter_ezecheck/lib/screens/charts_screen.dart?raw';
import historyScreenDartRaw from '../../flutter_ezecheck/lib/screens/history_screen.dart?raw';
import cameraScreenDartRaw from '../../flutter_ezecheck/lib/screens/camera_capture_screen.dart?raw';
import authScreenDartRaw from '../../flutter_ezecheck/lib/screens/auth_screen.dart?raw';
import esp32FirmwareInoRaw from '../../flutter_ezecheck/esp32_firmware/ezecheck_esp32_max30102_cam.ino?raw';

export interface FlutterSourceFile {
  path: string;
  category:
    | 'Documentation'
    | 'Config'
    | 'Entry & Navigation'
    | 'Models'
    | 'Services'
    | 'Screens'
    | 'ESP32 Firmware';
  language: 'markdown' | 'yaml' | 'dart' | 'cpp';
  description: string;
  content: string;
}

export const FLUTTER_PROJECT_FILES: FlutterSourceFile[] = [
  {
    path: 'README.md',
    category: 'Documentation',
    language: 'markdown',
    description:
      'Complete REDSENSE architecture, Demo vs Hardware Mode guide, ESP32 JSON protocol, and AI integration documentation',
    content: readmeRaw,
  },
  {
    path: 'pubspec.yaml',
    category: 'Config',
    language: 'yaml',
    description:
      'Flutter dependencies (flutter_blue_plus, fl_chart, firebase_core, cloud_firestore, pdf, csv)',
    content: pubspecRaw,
  },
  {
    path: 'lib/main.dart',
    category: 'Entry & Navigation',
    language: 'dart',
    description:
      'REDSENSE Material 3 entry point with responsive Smartphone BottomBar & Tablet NavigationRail',
    content: mainDartRaw,
  },
  {
    path: 'lib/models/health_reading.dart',
    category: 'Models',
    language: 'dart',
    description:
      'Models for MAX30102 physiological telemetry, AS7341 spectral channels, and ESP32-CAM optical captures',
    content: healthReadingDartRaw,
  },
  {
    path: 'lib/services/ai_inference_service.dart',
    category: 'Services',
    language: 'dart',
    description:
      'AiInferenceService abstraction with deterministic MockAiInferenceService and TensorFlowLiteInferenceService placeholder',
    content: aiServiceDartRaw,
  },
  {
    path: 'lib/services/esp32_connectivity_service.dart',
    category: 'Services',
    language: 'dart',
    description:
      'BLE GATT & Wi-Fi HTTP/WebSocket communication layer for ESP32, MAX30102, AS7341, and ESP32-CAM',
    content: esp32ServiceDartRaw,
  },
  {
    path: 'lib/services/firebase_sync_service.dart',
    category: 'Services',
    language: 'dart',
    description:
      'Firebase Authentication and Cloud Firestore real-time synchronization service with offline Demo Mode fallback',
    content: firebaseSyncDartRaw,
  },
  {
    path: 'lib/services/export_service.dart',
    category: 'Services',
    language: 'dart',
    description: 'CSV exporter and non-diagnostic research PDF report generator',
    content: exportServiceDartRaw,
  },
  {
    path: 'lib/screens/dashboard_screen.dart',
    category: 'Screens',
    language: 'dart',
    description: 'REDSENSE Dashboard with sensor cards and Start Screening primary action',
    content: dashboardScreenDartRaw,
  },
  {
    path: 'lib/screens/screening_workflow_screen.dart',
    category: 'Screens',
    language: 'dart',
    description:
      'Guided 8-Step Multimodal Anemia Screening Workflow (Device Check → Signal → Nailbed → Conjunctiva → Spectral → PPG → Quality → AI Result)',
    content: screeningWorkflowDartRaw,
  },
  {
    path: 'lib/screens/connectivity_screen.dart',
    category: 'Screens',
    language: 'dart',
    description: 'Bluetooth Low Energy, Wi-Fi, and Demo Mode device management screen',
    content: connectivityScreenDartRaw,
  },
  {
    path: 'lib/screens/charts_screen.dart',
    category: 'Screens',
    language: 'dart',
    description: 'Real-time Line and Bar charts using fl_chart',
    content: chartsScreenDartRaw,
  },
  {
    path: 'lib/screens/history_screen.dart',
    category: 'Screens',
    language: 'dart',
    description: 'Screening session history with Today / 7d / 30d filters and CSV/PDF export',
    content: historyScreenDartRaw,
  },
  {
    path: 'lib/screens/camera_capture_screen.dart',
    category: 'Screens',
    language: 'dart',
    description: 'ESP32-CAM live preview and optical image acquisition screen',
    content: cameraScreenDartRaw,
  },
  {
    path: 'lib/screens/auth_screen.dart',
    category: 'Screens',
    language: 'dart',
    description: 'Email and password login, registration, and session management screen',
    content: authScreenDartRaw,
  },
  {
    path: 'esp32_firmware/ezecheck_esp32_max30102_cam.ino',
    category: 'ESP32 Firmware',
    language: 'cpp',
    description: 'Reference ESP32 C++/Arduino firmware streaming JSON sensor packets',
    content: esp32FirmwareInoRaw,
  },
];

export async function downloadFlutterProjectZip(): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder('redsense_flutter_research_platform');
  if (!root) return;

  FLUTTER_PROJECT_FILES.forEach((file) => {
    root.file(file.path, file.content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'redsense_flutter_research_platform.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
