import { NextRequest, NextResponse } from "next/server";
import { TokenVerifier } from "livekit-server-sdk";
import { recordingStore } from "@/lib/recordingStore";
import { interviewStore } from "@/lib/interviewStore";
import { resolveLiveKitCredentials } from "@/lib/tokenService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const roomId = (formData.get("roomId") as string) || "";
    const participantIdentity = (formData.get("participantIdentity") as string) || "";
    const durationSeconds = parseInt((formData.get("durationSeconds") as string) || "0", 10);
    const requestedTrackType = formData.get("trackType");
    const trackType =
      requestedTrackType === "audio" || requestedTrackType === "composite"
        ? requestedTrackType
        : "video";
    const customFileName = (formData.get("customFileName") as string) || (file?.name || "");
    const offsetMs = parseInt((formData.get("offsetMs") as string) || "0", 10);

    if (!file || !roomId || !participantIdentity) {
      return NextResponse.json(
        { error: "Missing required fields: file, roomId, participantIdentity" },
        { status: 400 }
      );
    }

    const authorization = req.headers.get("authorization");
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const credentials = resolveLiveKitCredentials({
      apiKey: process.env.LIVEKIT_API_KEY,
      apiSecret: process.env.LIVEKIT_API_SECRET,
      livekitUrl: process.env.LIVEKIT_URL,
    });
    if (!bearerToken || !credentials.apiKey || !credentials.apiSecret) {
      return NextResponse.json({ error: "A valid studio recording token is required." }, { status: 401 });
    }

    let claims;
    try {
      claims = await new TokenVerifier(credentials.apiKey, credentials.apiSecret).verify(bearerToken);
    } catch {
      return NextResponse.json({ error: "Studio recording token is invalid or expired." }, { status: 401 });
    }

    let tokenRole: string | undefined;
    try {
      tokenRole = JSON.parse(claims.metadata || "{}").role;
    } catch {
      return NextResponse.json({ error: "Studio recording token has invalid participant metadata." }, { status: 401 });
    }

    const requestedRole = (formData.get("role") as string) === "host" ? "host" : "guest";
    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 0 ||
      !Number.isFinite(offsetMs) ||
      offsetMs < 0 ||
      (requestedTrackType !== "audio" &&
        requestedTrackType !== "video" &&
        requestedTrackType !== "composite") ||
      (requestedRole === "guest" && requestedTrackType === "composite")
    ) {
      return NextResponse.json({ error: "Recording metadata is invalid." }, { status: 400 });
    }

    if (
      claims.sub !== participantIdentity ||
      claims.video?.room !== roomId ||
      claims.video?.roomJoin !== true ||
      claims.video?.canPublish !== true ||
      tokenRole !== requestedRole ||
      !file.size
    ) {
      return NextResponse.json({ error: "Recording upload is not authorized." }, { status: 403 });
    }

    const interview = interviewStore.getById(roomId);
    if (!interview) {
      return NextResponse.json({ error: "Studio not found." }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const savedTrack = recordingStore.saveTrack(roomId, {
      participantIdentity,
      participantName: claims.name || "Participant",
      role: requestedRole,
      mimeType: file.type || "video/webm",
      durationSeconds,
      fileBuffer: buffer,
      trackType,
      customFileName,
      offsetMs,
    });

    // Mark interview recording status based on physical verification of tracks
    const verification = recordingStore.verifySession(roomId);
    interviewStore.update(roomId, {
      recordingStatus: verification.isComplete ? "completed" : "uploaded",
      status: verification.isComplete ? "completed" : interview.status,
    });

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
