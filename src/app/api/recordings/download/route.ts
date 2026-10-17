import { NextRequest, NextResponse } from "next/server";
import { recordingStore } from "@/lib/recordingStore";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const roomId = req.nextUrl.searchParams.get("roomId");
    const file = req.nextUrl.searchParams.get("file");

    if (!roomId || !file) {
      return NextResponse.json({ error: "Missing roomId or file query param" }, { status: 400 });
    }

    const filePath = recordingStore.getTrackFilePath(roomId, file);
    if (!filePath) {
      return NextResponse.json({ error: "Recording file not found" }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const isInline = req.nextUrl.searchParams.get("inline") === "true";

    // Determine correct MIME type for isolated audio vs video stems
    let contentType = "video/webm";
    const lowerFile = file.toLowerCase();
    if (lowerFile.includes("audio") || lowerFile.endsWith(".opus")) {
      contentType = lowerFile.endsWith(".mp4") ? "audio/mp4" : "audio/webm; codecs=opus";
    } else if (lowerFile.endsWith(".mp4")) {
      contentType = "video/mp4";
    } else if (lowerFile.endsWith(".wav")) {
      contentType = "audio/wav";
    }

    const disposition = isInline ? `inline; filename="${file}"` : `attachment; filename="${file}"`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Content-Disposition": disposition,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Download failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
