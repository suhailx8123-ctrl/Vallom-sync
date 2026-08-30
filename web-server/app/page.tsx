"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import TelemetryGauges from "@/components/TelemetryGauges";
import RhythmVisualizer from "@/components/RhythmVisualizer";
import AISpeechFeed from "@/components/AISpeechFeed";
import CrewSyncGrid from "@/components/CrewSyncGrid";
import { TelemetryPacket, CoachAdvice } from "@/lib/store";

export default function VallamDashboard() {
  const [mode, setMode] = useState<string>("NORMAL");
  const [targetSPM, setTargetSPM] = useState<number>(90);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<TelemetryPacket>({
    athlete_id: 1,
    current_spm: 0,
    target_spm: 90,
    accel_max: 0,
    avg_accel: 0,
    stroke_count: 0,
    pace_context: "READY",
    consistency: 100,
    timestamp: Date.now(),
  });
  const [history, setHistory] = useState<TelemetryPacket[]>([]);
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Update target SPM based on mode selection
  useEffect(() => {
    switch (mode) {
      case "NORMAL": setTargetSPM(90); break;
      case "MEDIUM": setTargetSPM(100); break;
      case "HIGH_SPEED": setTargetSPM(120); break;
      case "CUSTOM": setTargetSPM(95); break;
    }
  }, [mode]);

  // Polling Server Telemetry (every 600ms)
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("/api/telemetry");
        if (res.ok) {
          const data = await res.json();
          if (data.athletes && data.athletes.length > 0) {
            const current = data.athletes[0];
            setTelemetry(current);
            setIsConnected(Date.now() - current.timestamp < 4000);
          }
          if (data.history) setHistory(data.history);
          if (data.latestAdvice) setAdvice(data.latestAdvice);
        }
      } catch (err) {
        console.error("Telemetry fetch error:", err);
      }
    };

    const interval = setInterval(fetchTelemetry, 600);
    return () => clearInterval(interval);
  }, []);

  // Built-in Simulator Loop (Generates realistic Kerala Boat rowing curves)
  useEffect(() => {
    if (!isSimulating) return;

    let simSPM = targetSPM - 4;
    let strokes = 12;

    const simInterval = setInterval(async () => {
      // Add natural biomechanical drift
      const noise = Math.floor(Math.random() * 7) - 3;
      simSPM = Math.max(40, Math.min(130, simSPM + noise));
      strokes += 1;
      const accel = 14 + Math.random() * 5.2;

      let paceContext = "NORMAL";
      if (simSPM > targetSPM + 8) paceContext = "RAPID PACE INCREASE";
      else if (simSPM < targetSPM - 8) paceContext = "RAPID PACE DROP";

      const payload = {
        athlete_id: 1,
        current_spm: simSPM,
        target_spm: targetSPM,
        accel_max: accel,
        avg_accel: 15.2,
        stroke_count: strokes,
        pace_context: paceContext,
        consistency: Math.max(40, 100 - Math.abs(simSPM - targetSPM) * 2),
      };

      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }, 1200);

    return () => clearInterval(simInterval);
  }, [isSimulating, targetSPM]);

  // Manual Trigger for Gemini AI
  const handleTriggerAI = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(telemetry),
      });
      const data = await res.json();
      if (data.advice) {
        setAdvice(data.advice);
      }
    } catch (err) {
      console.error("Gemini invocation failed:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      <Header
        mode={mode}
        setMode={setMode}
        isSimulating={isSimulating}
        toggleSimulation={() => setIsSimulating(!isSimulating)}
        isConnected={isConnected || isSimulating}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Row 1: Primary Telemetry Gauges */}
        <TelemetryGauges data={telemetry} />

        {/* Row 2: Waveform Visualizer & AI Coach Speech */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RhythmVisualizer
            history={history}
            currentSPM={telemetry.current_spm}
            targetSPM={telemetry.target_spm}
          />
          <AISpeechFeed
            advice={advice}
            onManualTrigger={handleTriggerAI}
            isLoading={isAiLoading}
          />
        </div>

        {/* Row 3: Boat Crew Synchronization Pods */}
        <CrewSyncGrid athletes={[telemetry]} targetSPM={targetSPM} />
      </div>

      <footer className="border-t border-zinc-900 py-4 text-center text-xs text-zinc-600">
        Vallam Sync • IoT Telemetry & AI Coaching Platform for Kerala Vallamkali
      </footer>
    </main>
  );
}
