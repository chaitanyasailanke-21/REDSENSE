import nailbedAsset from '../assets/images/nailbed_optical_capture_1791132420736.jpg';
import conjunctivaAsset from '../assets/images/esp32_cam_ocular_sclera_1791128411013.jpg';
import hardwareRigAsset from '../assets/images/esp32_hardware_rig_1791128424359.jpg';

/**
 * ESP32-CAM HTTP Optical Image Acquisition Service.
 * Supports configurable IP endpoints (GET /capture and GET /stream) plus Demo Mode simulation.
 */
export class ESP32CamService {
  private connectedIp: string = '192.168.1.100';
  private isConnectedState: boolean = false;

  async connectCamera(ipAddress: string, isDemoMode: boolean): Promise<{
    connected: boolean;
    streamUrl: string;
    message: string;
  }> {
    this.connectedIp = ipAddress.trim() || '192.168.1.100';
    if (isDemoMode) {
      this.isConnectedState = true;
      return {
        connected: true,
        streamUrl: nailbedAsset,
        message: 'ESP32-CAM simulated optical feed active (DEMO DATA).',
      };
    }

    this.isConnectedState = true;
    return {
      connected: true,
      streamUrl: this.getCameraStream(this.connectedIp),
      message: `Configured ESP32-CAM HTTP endpoint at http://${this.connectedIp}`,
    };
  }

  getCameraStream(ipAddress?: string): string {
    const host = (ipAddress || this.connectedIp).replace(/^https?:\/\//, '');
    return `http://${host}:81/stream`;
  }

  getCaptureEndpoint(ipAddress?: string): string {
    const host = (ipAddress || this.connectedIp).replace(/^https?:\/\//, '');
    return `http://${host}/capture`;
  }

  async captureImage(
    target: 'nailbed' | 'conjunctiva',
    isDemoMode: boolean,
    ipAddress?: string
  ): Promise<{
    imageDataUrl: string;
    isDemo: boolean;
    resolution: string;
    timestamp: number;
  }> {
    if (!isDemoMode && ipAddress) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(this.getCaptureEndpoint(ipAddress), {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result));
            reader.readAsDataURL(blob);
          });
          return {
            imageDataUrl: dataUrl,
            isDemo: false,
            resolution: '1600x1200 UXGA (ESP32-CAM)',
            timestamp: Date.now(),
          };
        }
      } catch {
        // Fallback to demo optical frame if physical ESP32-CAM HTTP endpoint is unreachable
      }
    }

    return {
      imageDataUrl: target === 'nailbed' ? nailbedAsset : conjunctivaAsset,
      isDemo: true,
      resolution: '1600x1200 UXGA (DEMO DATA)',
      timestamp: Date.now(),
    };
  }

  disconnectCamera(): void {
    this.isConnectedState = false;
  }

  getAssets() {
    return {
      nailbedAsset,
      conjunctivaAsset,
      hardwareRigAsset,
    };
  }
}

export const esp32CamService = new ESP32CamService();
export { nailbedAsset, conjunctivaAsset, hardwareRigAsset };
