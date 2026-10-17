import { NextRequest, NextResponse } from "next/server";
import { recordingStore } from "@/lib/recordingStore";
import { interviewStore } from "@/lib/interviewStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const roomId = (formData.get("roomId") as string) || "";
    const participantIdentity = (formData.get("participantIdentity") as string) || "";
    const participantName = (formData.get("participantName") as string) || "Participant";
    const role = (formData.get("role") as string) === "host" ? "host" : "guest";
    const durationSeconds = parseInt((formData.get("durationSeconds") as string) || "0", 10);
    const trackType =
      (formData.get("trackType") as "video" | "audio" | "composite" | "av") ||
      (file?.type?.startsWith("audio") ? "audio" : "video");
    const customFileName = (formData.get("customFileName") as string) || (file?.name || "");
    const offsetMs = parseInt((formData.get("offsetMs") as string) || "0", 10);

    if (!file || !roomId || !participantIdentity) {
      return NextResponse.json(
        { error: "Missing required fields: file, roomId, participantIdentity" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const savedTrack = recordingStore.saveTrack(roomId, {
      participantIdentity,
      participantName,
      role,
      mimeType: file.type || "video/webm",
      durationSeconds,
      fileBuffer: buffer,
      trackType,
      customFileName,
      offsetMs,
    });

    // Mark interview recording status based on physical verification of tracks
    const verification = recordingStore.verifySession(roomId);
    const interview = interviewStore.getById(roomId);
    if (interview) {
      interviewStore.update(roomId, {
        recordingStatus: verification.isComplete ? "completed" : "uploaded",
        status: verification.isComplete ? "completed" : interview.status,
      });
    }

    return NextResponse.json({
      success: true,
      track: savedTrack,
      verification,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Recording upload failed";
    console.error("Recording upload error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
