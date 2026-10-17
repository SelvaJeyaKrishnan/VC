"use client";

import { LiveKitRoom, RoomAudioRenderer, StartAudio } from "@livekit/components-react";
import "@livekit/components-styles";
import { StudioStage } from "./StudioStage";

interface StudioRoomProps {
  token: string;
  serverUrl: string;
  roomId: string;
  roomName?: string;
  role?: "host" | "guest";
  videoOptions?: boolean | { deviceId?: string };
  audioOptions?: boolean | { deviceId?: string };
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (err: Error) => void;
}

export function StudioRoom({
  token,
  serverUrl,
  roomId,
  roomName,
  role = "guest",
  videoOptions,
  audioOptions,
  onConnected,
  onDisconnected,
  onError,
}: StudioRoomProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      video={videoOptions ?? true}
      audio={audioOptions ?? true}
      onConnected={onConnected}
      onDisconnected={onDisconnected}
      onError={onError}
      data-lk-theme="default"
      className="h-[100dvh] w-full bg-[#0a0c10] flex flex-col overflow-hidden"
    >
      {/* Ensures remote participant audio streams play out */}
      <RoomAudioRenderer />

      {/* Browser autoplay policy guard */}
      <StartAudio
        label="Click to enable studio audio playback"
        className="fixed top-2 left-1/2 -translate-x-1/2 z-50 rounded-full bg-purple-600 px-4 py-1.5 text-xs font-bold text-white shadow-xl hover:bg-purple-500 cursor-pointer"
      />

      {/* Main Studio Interactive Stage */}
      <StudioStage
        roomId={roomId}
        roomName={roomName}
        role={role}
        onLeaveCall={onDisconnected}
      />
    </LiveKitRoom>
  );
}
