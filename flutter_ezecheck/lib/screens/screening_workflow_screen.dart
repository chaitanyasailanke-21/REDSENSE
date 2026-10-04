import 'package:flutter/material.dart';
import '../services/ai_inference_service.dart';

class ScreeningWorkflowScreen extends StatefulWidget {
  const ScreeningWorkflowScreen({super.key});

  @override
  State<ScreeningWorkflowScreen> createState() => _ScreeningWorkflowScreenState();
}

class _ScreeningWorkflowScreenState extends State<ScreeningWorkflowScreen> {
  int _currentStep = 0;
  final AiInferenceService _aiService = MockAiInferenceService();
  ScreeningResultModel? _result;

  static const List<String> _stepTitles = [
    'Step 1: Device Check (ESP32, MAX30102, ESP32-CAM, AS7341)',
    'Step 2: Real-Time Signal Quality ("Keep the measurement area still.")',
    'Step 3: Nailbed Optical Capture',
    'Step 4: Conjunctival / Eyelid Optical Image Acquisition',
    'Step 5: AS7341 Multi-Spectral Acquisition (415nm–940nm)',
    'Step 6: MAX30102 Physiological Supporting PPG Data',
    'Step 7: Pre-Inference Data Quality Validation',
    'Step 8: Multimodal AI Screening Result',
  ];

  Future<void> _executeDemoScreening() async {
    const input = ScreeningInput(
      nailbedImagePath: 'demo://nailbed_roi.jpg',
      conjunctivaImagePath: 'demo://conjunctiva_roi.jpg',
      spectralChannels: {
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
      heartRate: 78,
      spo2: 98,
      irRaw: 123456,
      redRaw: 98765,
      signalQuality: 92,
      deviceConnected: true,
    );
    final res = await _aiService.runInference(input);
    setState(() {
      _result = res;
      _currentStep = 7;
    });
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'REDSENSE Guided 8-Step Anemia Screening Workflow',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 6),
          const Text(
            'DEMO MODEL — NOT FOR MEDICAL USE. Laboratory hemoglobin/CBC testing is required for confirmation.',
            style: TextStyle(fontSize: 12, color: Color(0xFFB45309), fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          Stepper(
            currentStep: _currentStep,
            onStepTapped: (idx) => setState(() => _currentStep = idx),
            onStepContinue: () {
              if (_currentStep < 6) {
                setState(() => _currentStep += 1);
              } else if (_currentStep == 6) {
                _executeDemoScreening();
              }
            },
            onStepCancel: () {
              if (_currentStep > 0) setState(() => _currentStep -= 1);
            },
            steps: List.generate(_stepTitles.length, (i) {
              return Step(
                title: Text(_stepTitles[i], style: const TextStyle(fontWeight: FontWeight.w600)),
                isActive: i <= _currentStep,
                content: Align(
                  alignment: Alignment.centerLeft,
                  child: i == 7 && _result != null
                      ? Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _result!.outcome,
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 8),
                                Text('Model Confidence: ${_result!.confidence}%  ·  Signal Quality: ${_result!.signalQuality}%'),
                                Text('Model: ${_result!.modelVersion}'),
                                const SizedBox(height: 8),
                                Text(_result!.recommendation),
                                const SizedBox(height: 8),
                                const Text(
                                  'IMPORTANT: This is a screening result and not a medical diagnosis. A laboratory hemoglobin/CBC test is required for confirmation.',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                        )
                      : Text('Step ${i + 1} multimodal acquisition stage ready.'),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
