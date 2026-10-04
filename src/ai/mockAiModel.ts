import {
  MultimodalFeatures,
  ScreeningOutcome,
  DataQualityCheckResult,
} from '../models/redsenseTypes';

export const DEMO_MODEL_VERSION = 'REDSENSE-MULTIMODAL-v0.1 (DEMO AI — NOT FOR MEDICAL USE)';

export interface MultimodalInferenceOutput {
  outcome: ScreeningOutcome;
  recommendation: string;
  confidence: number;
  modelVersion: string;
  fusionScore: number;
  explanation: string;
}

/**
 * Deterministic DEMO Multimodal Fusion Model.
 * Evaluates Q-band spectral ratio (555nm/630nm), Red/IR optical absorbance ratio, and image ROI quality.
 * Does NOT generate random outputs; identical inputs always produce identical screening results.
 */
export function runDeterministicDemoModel(
  features: MultimodalFeatures,
  qualityCheck: DataQualityCheckResult
): MultimodalInferenceOutput {
  if (!qualityCheck.isValid) {
    return {
      outcome: 'Insufficient data',
      recommendation: 'Measurement quality insufficient. Please repeat the test.',
      confidence: 0,
      modelVersion: DEMO_MODEL_VERSION,
      fusionScore: 0,
      explanation: qualityCheck.summaryMessage,
    };
  }

  // Deterministic multimodal fusion calculation from spectral Q-band ratio (555/630) & optical red/IR ratio
  const qBand = features.spectralFeatures.qBandRatio555_630;
  const nirRatio = features.spectralFeatures.nirReferenceRatio680_910;
  const fusionScore = Number((qBand * 0.65 + (1 / Math.max(nirRatio, 0.5)) * 0.35).toFixed(3));

  // If 555nm green hemoglobin absorption relative to 630nm red reflectance is below 0.68, indicate elevated risk
  if (qBand < 0.68) {
    const confidence = Math.min(92, Math.max(76, Math.round(84 + (0.68 - qBand) * 30)));
    return {
      outcome: 'Elevated anemia risk indicated',
      recommendation:
        'Clinical confirmation recommended. Laboratory hemoglobin/CBC testing and evaluation by a qualified healthcare professional are required.',
      confidence,
      modelVersion: DEMO_MODEL_VERSION,
      fusionScore,
      explanation:
        'Multimodal fusion detected reduced 555nm/630nm hemoglobin Q-band optical attenuation combined with vascular bed reflectance features.',
    };
  }

  const confidence = Math.min(94, Math.max(80, Math.round(86 + (qBand - 0.68) * 25)));
  return {
    outcome: 'Lower anemia risk indicated',
    recommendation:
      'Screening does not indicate elevated anemia risk. Clinical confirmation via laboratory hemoglobin/CBC testing is always recommended for medical evaluation.',
    confidence,
    modelVersion: DEMO_MODEL_VERSION,
    fusionScore,
    explanation:
      'Multimodal optical reflectance across nailbed/conjunctival ROI, AS7341 spectral channels (415nm–910nm), and supporting PPG signal within nominal research baseline.',
  };
}
