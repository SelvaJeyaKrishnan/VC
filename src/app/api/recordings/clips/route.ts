import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { recordingStore } from "@/lib/recordingStore";
import {
  generateDefaultTranscript,
  generateMagicClips,
  type MagicClip,
  type TranscriptData,
} from "@/lib/transcriptEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId parameter" }, { status: 400 });
    }

    const roomDir = recordingStore.getRoomDir(roomId);
    const clipsPath = path.join(roomDir, "clips.json");

    if (fs.existsSync(clipsPath)) {
      const content = fs.readFileSync(clipsPath, "utf-8");
      return NextResponse.json({ clips: JSON.parse(content) as MagicClip[] });
    }

    // Load or generate transcript first
    const transcriptPath = path.join(roomDir, "transcript.json");
    let transcript: TranscriptData;

    if (fs.existsSync(transcriptPath)) {
      transcript = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
    } else {
      const manifest = recordingStore.getManifest(roomId);
      transcript = generateDefaultTranscript({
        roomId,
        durationSeconds: manifest?.durationSeconds || 120,
      });
      fs.writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2), "utf-8");
    }

    const clips = generateMagicClips(transcript);
    fs.writeFileSync(clipsPath, JSON.stringify(clips, null, 2), "utf-8");

    return NextResponse.json({ clips });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load clips";
    console.error("Clips GET error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, clips } = body;

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const roomDir = recordingStore.getRoomDir(roomId);
    const clipsPath = path.join(roomDir, "clips.json");

    let finalClips: MagicClip[];
    if (clips && Array.isArray(clips)) {
      finalClips = clips;
    } else {
      // Regenerate fresh clips
      const transcriptPath = path.join(roomDir, "transcript.json");
      let transcript: TranscriptData;
      if (fs.existsSync(transcriptPath)) {
        transcript = JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
      } else {
        const manifest = recordingStore.getManifest(roomId);
        transcript = generateDefaultTranscript({
          roomId,
          durationSeconds: manifest?.durationSeconds || 120,
        });
      }
      finalClips = generateMagicClips(transcript);
    }

    fs.writeFileSync(clipsPath, JSON.stringify(finalClips, null, 2), "utf-8");

    return NextResponse.json({ success: true, clips: finalClips });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process clips";
    console.error("Clips POST error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
