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

    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const q = query(collection(db, 'telemetry_logs'), orderBy('createdAt', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => doc.data());

    if (logs.length === 0) {
      return NextResponse.json({ error: "No telemetry data found in Firebase to analyze. Start rowing first!" }, { status: 400 });
    }

    let contextData = "No recent data available.";
    if (logs.length > 0) {
      const avgConsistency = logs.reduce((acc, log) => acc + (log.consistency || 0), 0) / logs.length;
      const maxAccel = Math.max(...logs.map(log => log.accel_max || 0));
      const avgSPM = logs.reduce((acc, log) => acc + (log.current_spm || 0), 0) / logs.length;
      contextData = `Recent 20 strokes context: Avg SPM: ${avgSPM.toFixed(1)}, Avg Consistency: ${avgConsistency.toFixed(2)}%, Max Accel: ${maxAccel.toFixed(2)} m/s^2.`;
    }

    const systemInstruction = `You are an expert Vallamkali (snake boat) rowing tactician. Answer the athlete's question concisely based on their actual rowing numbers. Context: ${contextData}`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemInstruction + "\n\nAthlete Question: " + prompt }] }
        ],
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

    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
       console.error("GEMINI RETURNED EMPTY TEXT:", geminiData);
       return NextResponse.json({ error: "Gemini connected, but returned no text format." }, { status: 500 });
    }
    
    return NextResponse.json({ reply: aiText });

  } catch (error: any) {
    console.error("AI Chat Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
