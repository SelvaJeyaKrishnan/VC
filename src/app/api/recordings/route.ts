import { NextRequest, NextResponse } from "next/server";
import { recordingStore } from "@/lib/recordingStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const roomId = req.nextUrl.searchParams.get("roomId");
    if (roomId) {
      const manifest = recordingStore.getManifest(roomId);
      return NextResponse.json({ session: manifest });
    }

    const sessions = recordingStore.getAllSessions();
    return NextResponse.json({ sessions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retrieve recordings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
