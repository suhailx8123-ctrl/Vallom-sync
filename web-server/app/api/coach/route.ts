import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { athlete_id, current_spm, target_spm, avg_accel, pace_context, consistency } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in Vercel environment variables." },
        { status: 500 }
      );
    }

    const prompt = `You are Vallam Sync AI Coach, an expert pacing system for traditional Kerala snake boat (Chundan Vallam) races. Analyze the following telemetry:
- Athlete ID: ${athlete_id}
- Current SPM: ${current_spm} (Strokes Per Minute)
- Target SPM: ${target_spm}
- Average Acceleration: ${avg_accel} m/s²
- Current Context: ${pace_context}
- Stroke Consistency: ${consistency}%
Task: Deliver ONE single concise, punchy coaching cue (max 60 characters). If pace dropped rapidly: tell them to rebuild cadence. If pace surged too fast: tell them to hold rhythm and conserve energy. If rhythm is unstable: tell them to lock in stroke sync. If on target: give high-energy Kerala boat race encouragement ("Theemba!", "Sync locked!"). Respond ONLY with the coaching message text.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    const adviceText = data.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/[\"\n]/g, "").trim() || "Maintain cadence!";

    let urgency: "normal" | "warning" | "critical" = "normal";
    if (pace_context.includes("RAPID") || consistency < 60) urgency = "warning";
    if (current_spm === 0) urgency = "critical";

    const adviceObj = {
      message: adviceText,
      timestamp: Date.now(),
      urgency,
    };

    store.latestAdvice = adviceObj;

    return NextResponse.json({ success: true, advice: adviceObj });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
