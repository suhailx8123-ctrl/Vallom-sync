"use client";

import React, { useState } from "react";
import { Sparkles, Volume2, VolumeX, Terminal, Loader2 } from "lucide-react";
import { CoachAdvice } from "@/lib/store";

interface AISpeechFeedProps {
  advice: CoachAdvice | null;
  onManualTrigger: () => void;
  isLoading: boolean;
}

export default function AISpeechFeed({
  advice,
  onManualTrigger,
  isLoading,
}: AISpeechFeedProps) {
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  const speak = (text: string) => {
    if (!audioEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const toggleAudio = () => {
    if (!audioEnabled && advice?.message) {
      speak(advice.message);
    }
    setAudioEnabled(!audioEnabled);
  };

  return (
    <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Gemini AI Rowing Coach
            </h2>
            <p className="text-xs text-zinc-400">Live Tactician & Rhythm Guidance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleAudio}
            className={`p-2 rounded-lg text-xs font-medium border transition-all ${
              audioEnabled
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
            title="Toggle Text-To-Speech coaching"
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={onManualTrigger}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold rounded-lg text-xs transition"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Terminal className="h-3.5 w-3.5" />
            )}
            Analyze
          </button>
        </div>
      </div>

      <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-xl p-4 my-2 flex items-center min-h-[90px]">
        {advice ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {new Date(advice.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                  advice.urgency === "warning"
                    ? "bg-orange-500/20 text-orange-400"
                    : advice.urgency === "critical"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {advice.urgency}
              </span>
            </div>
            <p className="text-base sm:text-lg font-bold text-zinc-100 italic">
              "{advice.message}"
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Waiting for stroke burst...</p>
        )}
      </div>

      <p className="text-[11px] text-zinc-500">
        AI automatically triggers on cadence deviations, stroke spikes, or 10-second intervals.
      </p>
    </div>
  );
}
