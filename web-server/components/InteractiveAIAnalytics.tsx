"use client";

import React, { useState } from "react";
import { Brain, MessageSquare, Activity, AlertTriangle, CheckCircle, Zap } from "lucide-react";

export default function InteractiveAIAnalytics() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleAnalyzeSession = async () => {
    setIsLoadingAnalysis(true);
    try {
      const res = await fetch("/api/analytics", { method: "POST" });
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: "user", text: userMessage }]);
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: "ai", text: data.reply || "No response." }]);
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: "ai", text: "Error connecting to AI Coach." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-500" />
          Interactive AI Coach Workspace
        </h2>
        <button
          onClick={handleAnalyzeSession}
          disabled={isLoadingAnalysis}
          className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
        >
          {isLoadingAnalysis ? "Analyzing..." : "Analyze Session"}
        </button>
      </div>

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-1 mb-2"><Activity className="w-4 h-4"/> Summary</h3>
            <p className="text-sm">{analysis.summary}</p>
          </div>
          <div className="bg-zinc-950 p-4 rounded-lg border border-green-900/30">
            <h3 className="text-sm font-semibold text-green-400 flex items-center gap-1 mb-2"><CheckCircle className="w-4 h-4"/> Strengths</h3>
            <ul className="text-sm list-disc list-inside text-zinc-300">
              {analysis.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="bg-zinc-950 p-4 rounded-lg border border-red-900/30">
            <h3 className="text-sm font-semibold text-red-400 flex items-center gap-1 mb-2"><AlertTriangle className="w-4 h-4"/> Bottlenecks</h3>
            <ul className="text-sm list-disc list-inside text-zinc-300">
              {analysis.bottlenecks?.map((b: string, i: number) => <li key={i}>{b}</li>)}
            </ul>
          </div>
          <div className="bg-zinc-950 p-4 rounded-lg border border-amber-900/30">
            <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-1 mb-2"><Zap className="w-4 h-4"/> Action Plan</h3>
            <ul className="text-sm list-disc list-inside text-zinc-300">
              {analysis.recommendedDrills?.map((d: string, i: number) => <li key={i}>{d}</li>)}
            </ul>
            <div className="mt-3 text-xs flex justify-between items-center bg-zinc-900 p-2 rounded">
              <span className="text-zinc-400">Fatigue Risk:</span>
              <span className={`font-bold ${analysis.fatigueRisk === 'High' ? 'text-red-500' : analysis.fatigueRisk === 'Medium' ? 'text-amber-500' : 'text-green-500'}`}>
                {analysis.fatigueRisk}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col h-64">
        <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
          <MessageSquare className="w-4 h-4" /> Coach Chat
        </h3>
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {chatHistory.length === 0 && (
            <p className="text-xs text-zinc-500 text-center italic mt-10">Ask a question about your pacing, rhythm, or biomechanics.</p>
          )}
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-100'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 text-zinc-400 rounded-lg p-3 text-sm italic">Coach is typing...</div>
            </div>
          )}
        </div>
        <form onSubmit={handleChatSubmit} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="e.g. Why did my cadence drop in the last 20 strokes?"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
          <button type="submit" disabled={isChatLoading || !chatInput.trim()} className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold px-4 py-2 rounded text-sm disabled:opacity-50">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
