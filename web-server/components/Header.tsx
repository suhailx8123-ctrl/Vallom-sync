"use client";

import React from "react";
import { Activity, Radio, Cpu, RefreshCw } from "lucide-react";

interface HeaderProps {
  mode: string;
  setMode: (mode: string) => void;
  isSimulating: boolean;
  toggleSimulation: () => void;
  isConnected: boolean;
  targetSPM: number;
  setTargetSPM: (spm: number) => void;
}

export default function Header({
  mode,
  setMode,
  isSimulating,
  toggleSimulation,
  isConnected,
  targetSPM,
  setTargetSPM,
}: HeaderProps) {
  const modes = ["NORMAL", "MEDIUM", "HIGH_SPEED", "CUSTOM"];

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Activity className="h-6 w-6 text-zinc-950 font-bold" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-white uppercase flex items-center gap-2">
              Vallam Sync <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">AI TELEMETRY</span>
            </h1>
            <p className="text-xs text-zinc-400">Kerala Snake Boat Real-Time Performance & Cadence Sync</p>
          </div>
        </div>

        {/* Controls & Badges */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Mode Selector */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 items-center">
            {modes.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  mode === m ? "bg-amber-500 text-zinc-950 shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
            {mode === "CUSTOM" && (
              <input
                type="number"
                min={40}
                max={150}
                value={targetSPM}
                onChange={(e) => setTargetSPM(Number(e.target.value))}
                className="ml-2 w-16 bg-zinc-800 text-white text-xs px-2 py-1 rounded border border-zinc-700 outline-none focus:border-amber-500"
              />
            )}
          </div>

          {/* Hardware Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
            <Radio className={`h-3.5 w-3.5 ${
              isConnected ? "text-emerald-400 animate-pulse" : "text-zinc-600"
            }`} />
            <span className={isConnected ? "text-emerald-400" : "text-zinc-500"}>
              {isConnected ? "ESP32 ONLINE" : "AWAITING SENSOR"}
            </span>
          </div>

          {/* Simulator Toggle */}
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isSimulating
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-sm shadow-cyan-500/20"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            {isSimulating ? "Simulator Active" : "Run Simulator"}
          </button>
        </div>
      </div>
    </header>
  );
}
