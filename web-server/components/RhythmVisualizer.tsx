"use client";

import React, { useEffect, useRef } from "react";
import { TelemetryPacket } from "@/lib/store";

interface VisualizerProps {
  history: TelemetryPacket[];
  currentSPM: number;
  targetSPM: number;
}

export default function RhythmVisualizer({
  history,
  currentSPM,
  targetSPM,
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      // Draw grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Calculate wave frequency based on live SPM
      const frequency = currentSPM > 0 ? (currentSPM / 60) * 0.08 : 0.01;
      const amplitude = currentSPM > 0 ? Math.min(height * 0.38, 45) : 5;

      // Draw Target Ghost Wave
      ctx.beginPath();
      ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      const targetFreq = (targetSPM / 60) * 0.08;
      for (let x = 0; x < width; x++) {
        const y = midY + Math.sin(x * targetFreq + phase * 0.9) * 35;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Draw Live Cadence Wave
      ctx.beginPath();
      ctx.strokeStyle = currentSPM > 0 ? "#06b6d4" : "#52525b";
      ctx.lineWidth = 3;
      ctx.shadowColor = currentSPM > 0 ? "#06b6d4" : "transparent";
      ctx.shadowBlur = 10;
      for (let x = 0; x < width; x++) {
        const y = midY + Math.sin(x * frequency + phase) * amplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      phase -= 0.06;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [currentSPM, targetSPM]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Stroke Waveform & Cadence Sync
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time hydrodynamic stroke oscillation vs boat target rhythm
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400"></span>
            <span className="text-zinc-300">Live Wave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400/60 inline-block"></span>
            <span className="text-zinc-400">Target Rhythm</span>
          </div>
        </div>
      </div>

      <div className="w-full h-44 bg-zinc-950/60 rounded-xl overflow-hidden border border-zinc-800/50 relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={180}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
