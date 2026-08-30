import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured. Add it to Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const q = query(collection(db, 'telemetry_logs'), orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => doc.data());

    if (logs.length === 0) {
      return NextResponse.json({ error: "No telemetry data found in Firebase to analyze. Start rowing first!" }, { status: 400 });
    }

    const avgConsistency = logs.reduce((acc, log) => acc + (log.consistency || 0), 0) / logs.length;
    const maxAccel = Math.max(...logs.map(log => log.accel_max || 0));
    const avgSPM = logs.reduce((acc, log) => acc + (log.current_spm || 0), 0) / logs.length;

    const prompt = `
      You are an expert Vallamkali (snake boat) rowing tactician. Analyze this recent session data:
      - Strokes analyzed: ${logs.length}
      - Average Consistency: ${avgConsistency.toFixed(2)}%
      - Max Acceleration: ${maxAccel.toFixed(2)} m/s^2
      - Average SPM: ${avgSPM.toFixed(1)}

      Return a JSON response evaluating the race with exactly this schema:
      {
        "summary": "Overall evaluation of the pacing and power",
        "strengths": ["Strength 1", "Strength 2"],
        "bottlenecks": ["Flaw 1", "Flaw 2"],
        "recommendedDrills": ["Drill 1", "Drill 2"],
        "fatigueRisk": "Low" | "Medium" | "High"
      }
      Do NOT include any markdown formatting or backticks around the JSON. Just return the raw JSON.
    `;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      })
    });

    const geminiData = await geminiRes.json();
    
    if (!geminiRes.ok) {
      console.error("GEMINI API ERROR:", geminiData);
      return NextResponse.json(
        { error: `Gemini API Failed: ${geminiData.error?.message || "Unknown Error"}` }, 
        { status: geminiRes.status }
      );
    }

    let aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
       console.error("GEMINI RETURNED EMPTY TEXT:", geminiData);
       return NextResponse.json({ error: "Gemini connected, but returned no text format." }, { status: 500 });
    }
    
    // Clean up potential markdown formatting
    aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return NextResponse.json(JSON.parse(aiText));

  } catch (error: any) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
