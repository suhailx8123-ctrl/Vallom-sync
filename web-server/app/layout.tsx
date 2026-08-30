import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vallam Sync | AI Rowing Telemetry Platform",
  description: "Real-time telemetry and Gemini AI coaching for Kerala snake boat racing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
