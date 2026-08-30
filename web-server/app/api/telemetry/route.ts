import { NextRequest, NextResponse } from "next/server";
import { store, TelemetryPacket } from "@/lib/store";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  const athletesArray = Array.from(store.athletes.values());
  return NextResponse.json({
    success: true,
    athletes: athletesArray,
    history: store.history.slice(-30),
    latestAdvice: store.latestAdvice,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const packet: TelemetryPacket = {
      athlete_id: Number(body.athlete_id || 1),
      current_spm: Number(body.current_spm ?? 0),
      target_spm: Number(body.target_spm ?? 90),
      accel_max: Number(body.accel_max ?? 0),
      avg_accel: Number(body.avg_accel ?? 0),
      stroke_count: Number(body.stroke_count ?? 0),
      pace_context: String(body.pace_context || "NORMAL"),
      consistency: Number(body.consistency ?? 100),
      timestamp: Date.now(),
    };

    store.athletes.set(packet.athlete_id, packet);
    store.history.push(packet);
    if (store.history.length > 200) {
      store.history.shift();
    }

    addDoc(collection(db, "telemetry_logs"), {
      ...packet,
      createdAt: serverTimestamp(),
    }).catch(e => console.error("Firebase write error:", e));

    return NextResponse.json({
      success: true,
      received: packet,
      targetSPM: store.globalTargetSPM,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Invalid payload" },
      { status: 400 }
    );
  }
}
