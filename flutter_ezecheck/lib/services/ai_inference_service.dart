import '../models/health_reading.dart';

class ScreeningInput {
  final String nailbedImagePath;
  final String conjunctivaImagePath;
  final Map<String, int> spectralChannels;
  final double heartRate;
  final double spo2;
  final int irRaw;
  final int redRaw;
  final int signalQuality;
  final bool deviceConnected;

  const ScreeningInput({
    required this.nailbedImagePath,
    required this.conjunctivaImagePath,
    required this.spectralChannels,
    required this.heartRate,
    required this.spo2,
    required this.irRaw,
    required this.redRaw,
    required this.signalQuality,
    required this.deviceConnected,
  });
}

class ScreeningResultModel {
  final String outcome; // "Lower anemia risk indicated" | "Elevated anemia risk indicated" | "Insufficient data"
  final String recommendation;
  final int confidence;
  final int signalQuality;
  final String modelVersion;
  final DateTime timestamp;
  final List<String> dataSourcesUsed;

  const ScreeningResultModel({
    required this.outcome,
    required this.recommendation,
    required this.confidence,
    required this.signalQuality,
    required this.modelVersion,
    required this.timestamp,
    required this.dataSourcesUsed,
  });
}

/// Abstract AI interface so a trained TensorFlow Lite or ONNX Runtime model
/// can replace MockAiInferenceService without modifying UI screens.
abstract class AiInferenceService {
  String getModelVersion();
  bool validateInput(ScreeningInput input);
  Future<ScreeningResultModel> runInference(ScreeningInput input);
}

class MockAiInferenceService implements AiInferenceService {
  @override
  String getModelVersion() => 'REDSENSE-MULTIMODAL-v0.1 (DEMO MODEL — NOT FOR MEDICAL USE)';

  @override
  bool validateInput(ScreeningInput input) {
    return input.nailbedImagePath.isNotEmpty &&
        input.conjunctivaImagePath.isNotEmpty &&
        input.signalQuality >= 65 &&
        input.irRaw > 50000 &&
        input.spectralChannels.isNotEmpty &&
        input.deviceConnected;
  }

  @override
  Future<ScreeningResultModel> runInference(ScreeningInput input) async {
    if (!validateInput(input)) {
      return ScreeningResultModel(
        outcome: 'Insufficient data',
        recommendation: 'Measurement quality insufficient. Please repeat the measurement.',
        confidence: 0,
        signalQuality: input.signalQuality,
        modelVersion: getModelVersion(),
        timestamp: DateTime.now(),
        dataSourcesUsed: const [],
      );
    }

    // Deterministic calculation based on AS7341 555nm / 630nm Q-band ratio
    final int ch555 = input.spectralChannels['555'] ?? 180;
    final int ch630 = input.spectralChannels['630'] ?? 230;
    final double qBandRatio = ch555 / (ch630 == 0 ? 1 : ch630);

    final bool elevatedRisk = qBandRatio < 0.68;

    return ScreeningResultModel(
      outcome: elevatedRisk ? 'Elevated anemia risk indicated' : 'Lower anemia risk indicated',
      recommendation: elevatedRisk
          ? 'Clinical confirmation recommended. A laboratory hemoglobin/CBC test and evaluation by a qualified healthcare professional are required.'
          : 'Screening does not indicate elevated anemia risk. Clinical confirmation via laboratory hemoglobin/CBC testing is required for medical evaluation.',
      confidence: elevatedRisk ? 84 : 88,
      signalQuality: input.signalQuality,
      modelVersion: getModelVersion(),
      timestamp: DateTime.now(),
      dataSourcesUsed: const [
        'Nailbed Optical ROI (ESP32-CAM)',
        'Conjunctival Optical Acquisition (ESP32-CAM)',
        'AS7341 415nm–940nm Spectral Reflectance',
        'MAX30102 Dual-Wavelength PPG Supporting Stream',
      ],
    );
  }
}

/// Future TensorFlow Lite implementation placeholder.
/// Wire `tflite_flutter` Interpreter here when trained `.tflite` weights are available.
class TensorFlowLiteInferenceService implements AiInferenceService {
  @override
  String getModelVersion() => 'REDSENSE-TFLITE-v1.0';

  @override
  bool validateInput(ScreeningInput input) => input.signalQuality >= 70;

  @override
  Future<ScreeningResultModel> runInference(ScreeningInput input) async {
    // TODO: Load assets/models/redsense_multimodal_fusion.tflite and execute interpreter.runForMultipleInputs()
    return MockAiInferenceService().runInference(input);
  }
}
