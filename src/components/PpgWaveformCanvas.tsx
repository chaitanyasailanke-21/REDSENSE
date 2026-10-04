import React, { useEffect, useRef } from 'react';

interface PpgWaveformCanvasProps {
  heartRate: number;
  spo2: number;
  isConnected: boolean;
}

export const PpgWaveformCanvas: React.FC<PpgWaveformCanvasProps> = ({
  heartRate,
  spo2,
  isConnected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;
    const pointsRed: number[] = new Array(220).fill(0.5);
    const pointsIr: number[] = new Array(220).fill(0.5);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Subtle clinical calibration grid lines
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (isConnected) {
        const freq = Math.max(0.6, Math.min(3.2, heartRate / 60));
        phase += (freq * Math.PI * 2) / 55;
        const cycle = phase % (Math.PI * 2);

        // Realistic dicrotic notch arterial pulse wave model for MAX30102
        const systolic = Math.exp(-Math.pow((cycle - 1.2) / 0.42, 2));
        const dicrotic = 0.36 * Math.exp(-Math.pow((cycle - 2.45) / 0.52, 2));
        const baselineWander = 0.04 * Math.sin(phase * 0.18);

        const irVal = 0.72 - (systolic + dicrotic + baselineWander) * 0.48;
        const redRatio = (110 - spo2) / 15;
        const redVal = 0.76 - (systolic + dicrotic) * 0.48 * Math.min(1.1, Math.max(0.65, redRatio));

        pointsIr.push(irVal);
        pointsRed.push(redVal);
        if (pointsIr.length > 220) pointsIr.shift();
        if (pointsRed.length > 220) pointsRed.shift();
      }

      // Draw 880nm Infrared PPG trace (Primary clinical sky blue)
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      pointsIr.forEach((pt, idx) => {
        const x = (idx / (pointsIr.length - 1)) * width;
        const y = pt * height;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw 660nm Red LED PPG trace (Secondary teal trace)
      ctx.strokeStyle = '#0D9488';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      pointsRed.forEach((pt, idx) => {
        const x = (idx / (pointsRed.length - 1)) * width;
        const y = pt * height + 10;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [heartRate, spo2, isConnected]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-white">
      <canvas
        ref={canvasRef}
        width={680}
        height={140}
        className="h-[140px] w-full block cursor-crosshair"
      />
      <div className="flex items-center justify-between pt-2 text-xs text-slate-500 font-mono tabular-nums">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="h-2 w-2 rounded-full bg-sky-600" />
            880nm IR Plethysmograph (Solid)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="h-2 w-2 rounded-full bg-teal-600" />
            660nm Red Absorbance (Dashed)
          </span>
        </div>
        <span>Sample Rate: 100 Hz · 18-bit ADC</span>
      </div>
    </div>
  );
};
