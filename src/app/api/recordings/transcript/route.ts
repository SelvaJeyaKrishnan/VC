import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { recordingStore } from "@/lib/recordingStore";
import { authorizeStudioOwner } from "@/lib/studioAuth";
import { createEmptyTranscript, type TranscriptData } from "@/lib/transcriptEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId parameter" }, { status: 400 });
    }

    const authorization = await authorizeStudioOwner(roomId);
    if (!authorization.authorized) {
      return NextResponse.json(
        { error: authorization.status === 401 ? "Sign in to access studio transcripts." : "Studio not found." },
        { status: authorization.status }
      );
    }

    const roomDir = recordingStore.getRoomDir(roomId);
    const transcriptPath = path.join(roomDir, "transcript.json");

    if (fs.existsSync(transcriptPath)) {
      const content = fs.readFileSync(transcriptPath, "utf-8");
      return NextResponse.json(JSON.parse(content));
    }

    const manifest = recordingStore.getManifest(roomId);
    const emptyTranscript = createEmptyTranscript({
      roomId,
      durationSeconds: manifest?.durationSeconds || 0,
    });

    fs.writeFileSync(transcriptPath, JSON.stringify(emptyTranscript, null, 2), "utf-8");

    return NextResponse.json(emptyTranscript);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load transcript";
    console.error("Transcript GET error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, transcript, cuts } = body;

    if (!roomId || !transcript) {
      return NextResponse.json({ error: "Missing roomId or transcript" }, { status: 400 });
    }

    const authorization = await authorizeStudioOwner(roomId);
    if (!authorization.authorized) {
      return NextResponse.json(
        { error: authorization.status === 401 ? "Sign in to edit studio transcripts." : "Studio not found." },
        { status: authorization.status }
      );
    }

    const roomDir = recordingStore.getRoomDir(roomId);
    const transcriptPath = path.join(roomDir, "transcript.json");

    const updatedData: TranscriptData = {
      ...transcript,
      roomId,
      cuts: cuts || transcript.cuts || [],
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(transcriptPath, JSON.stringify(updatedData, null, 2), "utf-8");

    return NextResponse.json({ success: true, transcript: updatedData });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save transcript";
    console.error("Transcript POST error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
