import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const q = query(collection(db, 'telemetry_logs'), orderBy('createdAt', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => doc.data());

    let contextData = "No recent data available.";
    if (logs.length > 0) {
      const avgConsistency = logs.reduce((acc, log) => acc + (log.consistency || 0), 0) / logs.length;
      const maxAccel = Math.max(...logs.map(log => log.accel_max || 0));
      const avgSPM = logs.reduce((acc, log) => acc + (log.current_spm || 0), 0) / logs.length;
      contextData = `Recent 20 strokes context: Avg SPM: ${avgSPM.toFixed(1)}, Avg Consistency: ${avgConsistency.toFixed(2)}%, Max Accel: ${maxAccel.toFixed(2)} m/s^2.`;
    }

    const systemInstruction = `You are an expert Vallamkali (snake boat) rowing tactician. Answer the athlete's question concisely based on their actual rowing numbers. Context: ${contextData}`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemInstruction + "\n\nAthlete Question: " + prompt }] }
        ],
      })
    });

    if (!geminiRes.ok) {
      throw new Error("Failed to query Gemini API");
    }

    const geminiData = await geminiRes.json();
    const aiText = geminiData.candidates[0].content.parts[0].text;
    
    return NextResponse.json({ reply: aiText });

  } catch (error: any) {
    console.error("AI Chat Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
