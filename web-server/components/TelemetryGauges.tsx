"use client";

import React from "react";
import { Gauge, Zap, Flame, ShieldAlert, Award } from "lucide-react";
import { TelemetryPacket } from "@/lib/store";

interface GaugesProps {
  data: TelemetryPacket;
}

export default function TelemetryGauges({ data }: GaugesProps) {
  const delta = data.current_spm - data.target_spm;
  const isOptimal = Math.abs(delta) <= 5 && data.current_spm > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Current SPM Card */}
      <div className="relative overflow-hidden bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Live Cadence</span>
          <Gauge className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-5xl font-black tracking-tight text-white font-mono">
            {data.current_spm}
          </span>
          <span className="text-sm font-semibold text-zinc-400">SPM</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              data.current_spm === 0
                ? "bg-zinc-800 text-zinc-500"
                : isOptimal
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : delta > 0
                ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
            }`}
          >
            {data.current_spm === 0
              ? "Resting / Idle"
              : delta > 0
              ? `+${delta} SPM Over Target`
              : `${delta} SPM Below Target`}
          </span>
        </div>
      </div>

      {/* Target SPM Card */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Target Pace</span>
          <Flame className="h-4 w-4 text-orange-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-5xl font-black tracking-tight text-amber-400 font-mono">
            {data.target_spm}
          </span>
          <span className="text-sm font-semibold text-zinc-400">SPM</span>
        </div>
        <div className="mt-3 text-xs text-zinc-400">
          Target set for traditional rhythm sync
        </div>
      </div>

      {/* Acceleration Force Card */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Peak Stroke Force</span>
          <Zap className="h-4 w-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-5xl font-black tracking-tight text-cyan-300 font-mono">
            {data.accel_max.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-zinc-400">m/s²</span>
        </div>
        <div className="mt-3 text-xs text-zinc-400 flex items-center gap-2">
          <span>Avg: {data.avg_accel.toFixed(1)} m/s²</span>
          <span>•</span>
          <span>{data.stroke_count} Strokes</span>
        </div>
      </div>

      {/* Rhythm Consistency Card */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between text-zinc-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Sync Consistency</span>
          <Award className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-5xl font-black tracking-tight text-emerald-400 font-mono">
            {Math.round(data.consistency)}
          </span>
          <span className="text-sm font-semibold text-zinc-400">%</span>
        </div>
        <div className="mt-3">
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                data.consistency > 80
                  ? "bg-emerald-500"
                  : data.consistency > 50
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, data.consistency))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
