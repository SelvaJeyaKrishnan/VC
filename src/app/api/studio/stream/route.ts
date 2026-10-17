import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { recordingStore } from "@/lib/recordingStore";

export const dynamic = "force-dynamic";

export interface StreamDestination {
  id: string;
  platform: "youtube" | "twitch" | "facebook" | "custom";
  name: string;
  rtmpUrl: string;
  streamKey: string;
  enabled: boolean;
}

export interface LiveStreamSession {
  roomId: string;
  isLive: boolean;
  startedAt: string | null;
  destinations: StreamDestination[];
  health: {
    bitrateKbps: number;
    fps: number;
    resolution: string;
    droppedFramesPercent: number;
  };
}

const DEFAULT_DESTINATIONS: StreamDestination[] = [
  {
    id: "dest-youtube",
    platform: "youtube",
    name: "YouTube Live",
    rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",
    streamKey: "",
    enabled: false,
  },
  {
    id: "dest-twitch",
    platform: "twitch",
    name: "Twitch",
    rtmpUrl: "rtmp://live.twitch.tv/app/",
    streamKey: "",
    enabled: false,
  },
  {
    id: "dest-facebook",
    platform: "facebook",
    name: "Facebook Live",
    rtmpUrl: "rtmps://live-api-s.facebook.com:443/rtmp/",
    streamKey: "",
    enabled: false,
  },
];

function getStreamFilePath(roomId: string): string {
  const roomDir = recordingStore.getRoomDir(roomId);
  return path.join(roomDir, "stream_config.json");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const filePath = getStreamFilePath(roomId);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as LiveStreamSession;
      return NextResponse.json(data);
    }

    const initial: LiveStreamSession = {
      roomId,
      isLive: false,
      startedAt: null,
      destinations: DEFAULT_DESTINATIONS,
      health: {
        bitrateKbps: 4500,
        fps: 60,
        resolution: "1080p",
        droppedFramesPercent: 0,
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), "utf-8");
    return NextResponse.json(initial);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load stream state";
    console.error("Stream GET error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, action, destinations, isLive } = body;

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const filePath = getStreamFilePath(roomId);
    let state: LiveStreamSession;

    if (fs.existsSync(filePath)) {
      state = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } else {
      state = {
        roomId,
        isLive: false,
        startedAt: null,
        destinations: DEFAULT_DESTINATIONS,
        health: {
          bitrateKbps: 4500,
          fps: 60,
          resolution: "1080p",
          droppedFramesPercent: 0,
        },
      };
    }

    if (action === "save_destinations" && Array.isArray(destinations)) {
      state.destinations = destinations;
    } else if (action === "start") {
      const activeDests = state.destinations.filter((d) => d.enabled && d.streamKey.trim().length > 0);
      if (activeDests.length === 0) {
        return NextResponse.json(
          { error: "Please enable at least one destination and enter a valid stream key." },
          { status: 400 }
        );
      }
      state.isLive = true;
      state.startedAt = new Date().toISOString();
    } else if (action === "stop") {
      state.isLive = false;
      state.startedAt = null;
    } else if (typeof isLive === "boolean") {
      state.isLive = isLive;
      state.startedAt = isLive ? new Date().toISOString() : null;
    }

    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");

    return NextResponse.json({ success: true, session: state });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update stream state";
    console.error("Stream POST error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
