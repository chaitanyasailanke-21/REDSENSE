import {
  Esp32SensorPacket,
  MultimodalFeatures,
  SpectralChannels,
} from '../models/redsenseTypes';

/**
 * Step 1: Image Preprocessing (ROI cropping, white-balance normalization, vascular bed erythema index).
 * Placeholder ready to feed into TensorFlow Lite / ONNX Image Feature Extractor.
 */
export function preprocessImage(
  nailbedImageUrl: string,
  conjunctivaImageUrl: string,
  signalQuality: number
): MultimodalFeatures['imageFeatures'] {
  const hasNailbed = Boolean(nailbedImageUrl && nailbedImageUrl.length > 5);
  const hasConjunctiva = Boolean(conjunctivaImageUrl && conjunctivaImageUrl.length > 5);

  return {
    nailbedRednessIndex: hasNailbed ? Number((0.68 + (signalQuality - 80) * 0.002).toFixed(3)) : 0,
    conjunctivaPallorIndex: hasConjunctiva
      ? Number((0.24 - (signalQuality - 80) * 0.001).toFixed(3))
      : 0,
    illuminationUniformity: hasNailbed && hasConjunctiva ? 0.94 : 0.45,
  };
}

/**
 * Step 2: AS7341 Spectral Preprocessing (Min-max normalization, Soret 415nm & Hemoglobin Q-Band 555nm/630nm ratios).
 */
export function preprocessSpectralData(
  spectral: SpectralChannels
): MultimodalFeatures['spectralFeatures'] {
  const rawValues = [
    spectral['415'],
    spectral['445'],
    spectral['480'],
    spectral['515'],
    spectral['555'],
    spectral['590'],
    spectral['630'],
    spectral['680'],
    spectral['910'],
    spectral['940'] ?? 170,
  ];
  const maxVal = Math.max(...rawValues, 1);
  const normalizedChannels = rawValues.map((v) => Number((v / maxVal).toFixed(3)));

  const soretBandRatio415_555 = Number((spectral['415'] / Math.max(spectral['555'], 1)).toFixed(3));
  const qBandRatio555_630 = Number((spectral['555'] / Math.max(spectral['630'], 1)).toFixed(3));
  const nirReferenceRatio680_910 = Number(
    (spectral['680'] / Math.max(spectral['910'], 1)).toFixed(3)
  );

  return {
    soretBandRatio415_555,
    qBandRatio555_630,
    nirReferenceRatio680_910,
    normalizedChannels,
  };
}

/**
 * Step 3: MAX30102 PPG Preprocessing (Red/IR optical ratio & perfusion stability).
 * Note: Physiological pulse oximetry provides optical perfusion context, not direct anemia diagnosis.
 */
export function preprocessPPG(packet: Esp32SensorPacket): MultimodalFeatures['ppgFeatures'] {
  const acDcRatioRed = Number((packet.red / 100000).toFixed(3));
  const acDcRatioIr = Number((packet.ir / 120000).toFixed(3));
  const perfusionStability = Number((packet.signal_quality / 100).toFixed(2));

  return {
    acDcRatioRed,
    acDcRatioIr,
    perfusionStability,
    heartRateBpm: packet.heart_rate,
    spo2Pct: packet.spo2,
  };
}

/**
 * Combines Image, Spectral, and PPG feature vectors for Multimodal Fusion.
 */
export function extractFeatures(
  nailbedImageUrl: string,
  conjunctivaImageUrl: string,
  packet: Esp32SensorPacket
): MultimodalFeatures {
  return {
    imageFeatures: preprocessImage(nailbedImageUrl, conjunctivaImageUrl, packet.signal_quality),
    spectralFeatures: preprocessSpectralData(packet.spectral),
    ppgFeatures: preprocessPPG(packet),
  };
}
