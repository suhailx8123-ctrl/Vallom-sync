export interface TelemetryPacket {
  athlete_id: number;
  current_spm: number;
  target_spm: number;
  accel_max: number;
  avg_accel: number;
  stroke_count: number;
  pace_context: string;
  consistency: number;
  timestamp: number;
}

export interface CoachAdvice {
  message: string;
  timestamp: number;
  urgency: "normal" | "warning" | "critical";
}

// Global in-memory storage for Vercel serverless runtime cache
declare global {
  var vallamStore: {
    athletes: Map<number, TelemetryPacket>;
    history: TelemetryPacket[];
    latestAdvice: CoachAdvice | null;
    globalTargetSPM: number;
  } | undefined;
}

if (!global.vallamStore) {
  global.vallamStore = {
    athletes: new Map(),
    history: [],
    latestAdvice: {
      message: "Vallam Sync AI Coach initialized. Awaiting paddle stroke data.",
      timestamp: Date.now(),
      urgency: "normal",
    },
    globalTargetSPM: 90,
  };
}

export const store = global.vallamStore;
