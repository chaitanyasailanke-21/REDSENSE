# REDSENSE — Non-Invasive Anemia Screening Research Platform

**Developed by Chaitanya Sai**

> **IMPORTANT MEDICAL & RESEARCH PROTOTYPE DISCLAIMER**
> REDSENSE is a research and screening prototype, **NOT a medical diagnostic device**.
> All outputs use non-diagnostic screening terminology (*"Elevated anemia risk indicated"*, *"Lower anemia risk indicated"*, *"Insufficient data"*, *"Clinical confirmation recommended"*). Laboratory hemoglobin/CBC testing and evaluation by a qualified healthcare professional are required for clinical confirmation. Supporting physiological metrics (such as SpO2 and Heart Rate) provide optical signal context and do **not** directly diagnose anemia.

---

## 1. Project Purpose & Multimodal Pipeline

REDSENSE is designed as a low-cost, non-invasive anemia screening research platform integrating multimodal optical, spectral, and physiological sensors:

- **ESP32 Development Board**: Dual-core microcontroller streaming JSON telemetry over Wi-Fi (HTTP/WebSocket) and Bluetooth Low Energy (BLE GATT).
- **MAX30102 Optical Pulse Sensor**: Provides 660nm Red and 880nm Infrared photoplethysmography (PPG), Heart Rate, SpO2 supporting context, and contact signal quality.
- **ESP32-CAM (OV2640 + Controlled White LED Ring)**: Acquires calibrated optical images of the **Fingernail/Nailbed** and **Conjunctival/Eyelid** regions.
- **AS7341 11-Channel Spectral Sensor**: Measures optical reflectance across `415 nm`, `445 nm`, `480 nm`, `515 nm`, `555 nm`, `590 nm`, `630 nm`, `680 nm`, `910 nm`, and `940 nm` wavelengths.

### Data & AI Pipeline Architecture

```text
HARDWARE (ESP32 + MAX30102 + ESP32-CAM + AS7341)
  ↓
Sensor + Optical Image Data (JSON over BLE / Wi-Fi + HTTP /capture)
  ↓
REDSENSE Application (Web/PWA & Cross-Platform Flutter Mobile App)
  ↓
Preprocessing (preprocessImage, preprocessSpectralData, preprocessPPG)
  ↓
Multimodal Feature Extraction (extractFeatures)
  ↓
AIInferenceService (Deterministic Demo Model → Future TensorFlow Lite / ONNX Model)
  ↓
Non-Diagnostic Screening Result ("Elevated anemia risk indicated" / "Lower anemia risk indicated")
  ↓
Local Storage & Cloud Firestore Sync → PDF & CSV Research Reports
```

---

## 2. How to Run the Application

```bash
# 1. Install dependencies
npm install

# 2. Start the development server on port 3000
npm run dev

# 3. Build for production
npm run build
```

---

## 3. How Demo Mode vs. Hardware Mode Works

- **Demo Mode (`DEMO MODE: ON`)**:
  - Enabled by default so the entire application operates offline without physical ESP32 hardware or external services.
  - Simulates ESP32 connection, MAX30102 PPG waveforms, AS7341 415nm–940nm spectral channels, and ESP32-CAM nailbed/conjunctival optical captures.
  - Every simulated measurement, session, and report is explicitly badged with **`DEMO DATA`** and **`DEMO AI — NOT FOR MEDICAL USE`**.
  - Includes a deterministic scenario selector (*Lower Risk Baseline*, *Elevated Risk Profile*, *Insufficient Signal Quality*) so researchers can verify all workflow branches reproducibly.
- **Hardware Mode (`DEMO MODE: OFF`)**:
  - Activates live **Wi-Fi WebSocket/HTTP** (`ws://<esp32-ip>:81/ws`) and **Web Bluetooth GATT** (`4fafc201-1fb5-459e-8fcc-c5c9c331914b`) connections.
  - Connects to the configurable **ESP32-CAM IP address** (`http://<cam-ip>/capture` and `http://<cam-ip>:81/stream`).

---

## 4. ESP32 JSON Telemetry Protocol

The application parses and validates JSON packets matching this schema via `parseSensorPacket()` and `validateSensorPacket()` in `src/hardware/esp32Service.ts`:

```json
{
  "device_id": "REDSENSE-ESP32-001",
  "timestamp": 1720000000,
  "heart_rate": 78,
  "spo2": 98,
  "signal_quality": 92,
  "ir": 123456,
  "red": 98765,
  "spectral": {
    "415": 120,
    "445": 135,
    "480": 150,
    "515": 160,
    "555": 180,
    "590": 200,
    "630": 230,
    "680": 250,
    "910": 190,
    "940": 170
  }
}
```

---

## 5. Folder Structure

### Web / PWA Application (`src/`)
```text
src/
├── ai/
│   ├── aiInferenceService.ts    # Multimodal AI abstraction (Demo / TFLite / ONNX ready)
│   ├── mockAiModel.ts           # Deterministic multimodal fusion model
│   └── preprocessing.ts         # Image, Spectral (AS7341), and PPG (MAX30102) preprocessing
├── hardware/
│   ├── esp32Service.ts          # parseSensorPacket(), validateSensorPacket(), Wi-Fi & BLE
│   ├── max30102Service.ts       # MAX30102 PPG & signal quality evaluator
│   ├── as7341Service.ts         # AS7341 415nm–940nm spectral channel formatter
│   ├── esp32CamService.ts       # connectCamera(), getCameraStream(), captureImage()
│   └── mockHardwareService.ts   # Deterministic DEMO DATA stream generator
├── models/
│   └── redsenseTypes.ts         # Core TypeScript interfaces
├── services/
│   ├── firebaseService.ts       # Firebase Auth & Cloud Firestore sync with offline fallback
│   ├── storageService.ts        # LocalStorage persistence for offline capability
│   ├── pdfService.ts            # Formatted REDSENSE research PDF generator
│   └── csvService.ts            # Timestamped CSV exporter
└── pages & components/          # Dashboard, 8-Step Screening, Devices, Live Data, Camera, History, Reports, Profile, Settings
```

### Cross-Platform Flutter Mobile Codebase (`flutter_ezecheck/`)
Accessible directly in the **Flutter SDK** tab and downloadable as a complete `.zip` archive for Android & iOS builds (`flutter build apk` / `flutter build ios`).
