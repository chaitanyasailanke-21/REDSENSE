import { SpectralChannels } from '../models/redsenseTypes';

export interface SpectralChannelPoint {
  wavelength: string;
  nm: number;
  intensity: number;
  bandLabel: string;
  colorHex: string;
}

/**
 * AS7341 11-Channel Multi-Spectral Optical Sensor Service.
 * Formats 415nm–940nm spectral reflectance measurements for visualization and multimodal AI feature extraction.
 */
export class AS7341Service {
  toChartPoints(spectral: SpectralChannels): SpectralChannelPoint[] {
    return [
      { wavelength: '415 nm', nm: 415, intensity: spectral['415'], bandLabel: 'F1 Violet (Soret)', colorHex: '#6366F1' },
      { wavelength: '445 nm', nm: 445, intensity: spectral['445'], bandLabel: 'F2 Indigo', colorHex: '#3B82F6' },
      { wavelength: '480 nm', nm: 480, intensity: spectral['480'], bandLabel: 'F3 Blue', colorHex: '#0284C7' },
      { wavelength: '515 nm', nm: 515, intensity: spectral['515'], bandLabel: 'F4 Cyan', colorHex: '#0D9488' },
      { wavelength: '555 nm', nm: 555, intensity: spectral['555'], bandLabel: 'F5 Green (Hb Q-Band)', colorHex: '#10B981' },
      { wavelength: '590 nm', nm: 590, intensity: spectral['590'], bandLabel: 'F6 Yellow', colorHex: '#F59E0B' },
      { wavelength: '630 nm', nm: 630, intensity: spectral['630'], bandLabel: 'F7 Orange-Red', colorHex: '#F97316' },
      { wavelength: '680 nm', nm: 680, intensity: spectral['680'], bandLabel: 'F8 Deep Red', colorHex: '#EF4444' },
      { wavelength: '910 nm', nm: 910, intensity: spectral['910'], bandLabel: 'NIR Reference 1', colorHex: '#64748B' },
      { wavelength: '940 nm', nm: 940, intensity: spectral['940'] ?? 170, bandLabel: 'NIR Reference 2', colorHex: '#475569' },
    ];
  }
}

export const as7341Service = new AS7341Service();
