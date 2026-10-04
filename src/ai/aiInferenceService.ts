import {
  DataQualityCheckResult,
  Esp32SensorPacket,
  ScreeningSessionRecord,
} from '../models/redsenseTypes';
import { extractFeatures } from './preprocessing';
import {
  DEMO_MODEL_VERSION,
  MultimodalInferenceOutput,
  runDeterministicDemoModel,
} from './mockAiModel';

export interface ScreeningPipelineInput {
  ownerId: string;
  nailbedImageUrl: string;
  conjunctivaImageUrl: string;
  packet: Esp32SensorPacket;
  deviceConnected: boolean;
  isDemo: boolean;
  notes?: string;
}

/**
 * Abstraction layer for REDSENSE Multimodal AI Inference.
 * Designed so a trained TensorFlow Lite (.tflite) or ONNX Runtime (.onnx) model
 * can replace the deterministic demo model without changing UI or workflow code.
 */
export class AIInferenceService {
  getModelVersion(): string {
    return DEMO_MODEL_VERSION;
  }

  /**
   * STEP 7 — Validates all multimodal inputs prior to running AI inference.
   */
  validateInput(input: ScreeningPipelineInput): DataQualityCheckResult {
    const nailbedImageAvailable = Boolean(
      input.nailbedImageUrl && input.nailbedImageUrl.trim().length > 5
    );
    const conjunctivaImageAvailable = Boolean(
      input.conjunctivaImageUrl && input.conjunctivaImageUrl.trim().length > 5
    );
    const ppgSignalAvailable = input.packet.ir > 50000 && input.packet.red > 40000;
    const imageQualityAcceptable = input.packet.signal_quality >= 65;
    const spectralDataAvailable =
      input.packet.spectral['415'] > 0 &&
      input.packet.spectral['555'] > 0 &&
      input.packet.spectral['680'] > 0;
    const timestampValid = input.packet.timestamp > 1000000000;
    const deviceConnected = input.deviceConnected || input.isDemo;

    const isValid =
      nailbedImageAvailable &&
      conjunctivaImageAvailable &&
      imageQualityAcceptable &&
      ppgSignalAvailable &&
      spectralDataAvailable &&
      timestampValid &&
      deviceConnected;

    return {
      isValid,
      nailbedImageAvailable,
      conjunctivaImageAvailable,
      imageQualityAcceptable,
      ppgSignalAvailable,
      spectralDataAvailable,
      timestampValid,
      deviceConnected,
      summaryMessage: isValid
        ? 'All multimodal optical, spectral, and physiological signal quality checks passed.'
        : 'Measurement quality insufficient. Please repeat the test.',
    };
  }

  /**
   * STEP 8 — Runs multimodal feature extraction and model inference.
   * Replace internal call with TensorFlowLite / ONNX Runtime session execution when trained weights are ready.
   */
  runInference(input: ScreeningPipelineInput): {
    quality: DataQualityCheckResult;
    output: MultimodalInferenceOutput;
  } {
    const quality = this.validateInput(input);
    const features = extractFeatures(
      input.nailbedImageUrl,
      input.conjunctivaImageUrl,
      input.packet
    );
    const output = runDeterministicDemoModel(features, quality);
    return { quality, output };
  }

  /**
   * Generates a complete ScreeningSessionRecord ready for local persistence and Cloud Firestore sync.
   */
  generateScreeningResult(input: ScreeningPipelineInput): ScreeningSessionRecord {
    const { output } = this.runInference(input);

    return {
      id: `scr_${Date.now()}`,
      ownerId: input.ownerId || 'demo_user',
      timestamp: Date.now(),
      deviceId: input.packet.device_id || 'REDSENSE-ESP32-001',
      heartRate: input.packet.heart_rate,
      spo2: input.packet.spo2,
      signalQuality: input.packet.signal_quality,
      irRaw: input.packet.ir,
      redRaw: input.packet.red,
      spectral: input.packet.spectral,
      nailbedImageUrl: input.nailbedImageUrl,
      conjunctivaImageUrl: input.conjunctivaImageUrl,
      screeningOutcome: output.outcome,
      recommendation: output.recommendation,
      confidence: output.confidence,
      modelVersion: output.modelVersion,
      isDemo: input.isDemo,
      dataSourcesUsed: [
        'Nailbed Optical ROI (ESP32-CAM)',
        'Conjunctival Optical Acquisition (ESP32-CAM)',
        'AS7341 415nm–940nm Spectral Reflectance',
        'MAX30102 Dual-Wavelength PPG Supporting Stream',
      ],
      notes: input.notes || output.explanation,
    };
  }
}

export const aiInferenceService = new AIInferenceService();
