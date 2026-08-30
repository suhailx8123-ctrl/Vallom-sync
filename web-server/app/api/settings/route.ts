import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (typeof body.target_spm === "number") {
      store.globalTargetSPM = body.target_spm;
      return NextResponse.json({ success: true, target_spm: store.globalTargetSPM });
    } else {
      return NextResponse.json({ success: false, error: "Invalid target_spm" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Invalid payload" },
      { status: 400 }
    );
  }
}
