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
    const contentType = file.endsWith(".mp4") ? "video/mp4" : "video/webm";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `attachment; filename="${file}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Download failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
