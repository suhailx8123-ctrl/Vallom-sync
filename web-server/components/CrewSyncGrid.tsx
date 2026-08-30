"use client";

import React from "react";
import { TelemetryPacket } from "@/lib/store";
import { Users, CheckCircle2, AlertTriangle } from "lucide-react";

interface CrewSyncProps {
  athletes: TelemetryPacket[];
  targetSPM: number;
}

export default function CrewSyncGrid({ athletes, targetSPM }: CrewSyncProps) {
  // Pad grid with sample pods if only 1 athlete exists
  const displayPods =
    athletes.length > 0
      ? athletes
      : [
          {
            athlete_id: 1,
            current_spm: 0,
            target_spm: targetSPM,
            accel_max: 0,
            avg_accel: 0,
            stroke_count: 0,
            pace_context: "NO STROKE",
            consistency: 100,
            timestamp: Date.now(),
          },
        ];

  return (
    <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Crew Boat Synchronization Pods
          </h2>
        </div>
        <span className="text-xs text-zinc-400">
          {displayPods.length} Active Paddler Module{displayPods.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayPods.map((a) => {
          const diff = a.current_spm - a.target_spm;
          const inSync = Math.abs(diff) <= 6 && a.current_spm > 0;

          return (
            <div
              key={a.athlete_id}
              className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                    inSync
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : a.current_spm === 0
                      ? "bg-zinc-800 text-zinc-500"
                      : "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                  }`}
                >
                  #{a.athlete_id}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{a.current_spm} SPM</span>
                    {inSync ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    Force: {a.accel_max.toFixed(1)} m/s²
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono ${
                    inSync ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-400 bg-zinc-900"
                  }`}
                >
                  {a.pace_context}
                </span>
                <div className="text-[10px] text-zinc-500 mt-1">
                  Sync: {Math.round(a.consistency)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
