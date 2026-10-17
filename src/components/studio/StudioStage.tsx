"use client";

import { useState, useEffect } from "react";
import {
  useTracks,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Radio, Users, Copy, Check, Disc, Video, Share2 } from "lucide-react";
import { ParticipantTile } from "./ParticipantTile";
import { MediaControls } from "./MediaControls";
import { RecordingBar } from "./RecordingBar";
import { useLocalRecorder } from "@/hooks/useLocalRecorder";
import type { StudioLayoutMode } from "@/types/studio";

interface StudioStageProps {
  roomId: string;
  roomName?: string;
  role?: "host" | "guest";
  onLeaveCall?: () => void;
}

export function StudioStage({
  roomId,
  roomName,
  role: initialRole,
  onLeaveCall,
}: StudioStageProps) {
  const [layoutMode, setLayoutMode] = useState<StudioLayoutMode>("split");
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  // Role deduction with explicit prop priority
  const role: "host" | "guest" =
    initialRole ||
    (localParticipant?.identity?.startsWith("host-") ||
    localParticipant?.name?.toLowerCase().includes("host")
      ? "host"
      : "guest");

  // Local Multi-Track Recording Engine (lossless hardware capture)
  const {
    status: recordingStatus,
    duration: recordingDuration,
    fileSizeMb,
    uploadProgress,
    errorMessage: recordingError,
    localDownloadUrl,
    startRecording,
    stopRecording,
    dismissError: dismissRecordingError,
  } = useLocalRecorder({
    room,
    localParticipant,
    roomId,
    role,
    displayName: localParticipant?.name || (role === "host" ? "Creator Host" : "Guest"),
  });

  // Get all camera / screenshare track references with placeholders for muted tracks
  const trackReferences = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Timer for overall studio session duration
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds((sec) => sec + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Find local track reference
  const localTrackRef = trackReferences.find(
    (t) => t.participant.identity === localParticipant?.identity
  );

  // Find remote track references
  const remoteTrackRefs = trackReferences.filter(
    (t) => t.participant.identity !== localParticipant?.identity
  );
  const firstRemoteTrackRef = remoteTrackRefs[0];

  const participantCount = (localParticipant ? 1 : 0) + remoteParticipants.length;

  const handleCopyLink = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/?room=${encodeURIComponent(roomId)}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      prompt("Copy Guest Invite Link:", inviteUrl);
    }
  };

  const isActuallyRecording = recordingStatus === "recording";

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#0a0c10] text-slate-100 overflow-hidden select-none antialiased">
      {/* Studio Header Bar (Riverside Style) */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1f232e] bg-[#0e1017]/95 px-4 sm:px-6 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          {/* Studio Brand & Title */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Radio className="h-4 w-4" />
            </div>
            <span className="font-bold text-white text-sm hidden sm:inline">OneGuest</span>
            <span className="text-slate-600 hidden sm:inline">/</span>
            <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-[150px] sm:max-w-[240px]">
              {roomName || roomId}
            </span>
          </div>
        </div>

        {/* Center: Live Studio Session Status / Active Recording Pill */}
        <div className="flex items-center gap-2">
          {isActuallyRecording ? (
            /* NEVER display recording indicator unless recording is active */
            <div className="flex items-center gap-2 rounded-full border border-rose-500/60 bg-rose-950/60 px-3.5 py-1 text-xs font-bold text-rose-300 shadow-lg shadow-rose-950/40 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-[11px] uppercase tracking-wider">REC</span>
              <span className="font-mono">{formatTimer(recordingDuration)}</span>
            </div>
          ) : (
            /* Clean session duration */
            <div className="flex items-center gap-1.5 rounded-lg border border-[#202534] bg-[#12141c] px-3 py-1 font-mono text-xs text-slate-300">
              <span className="text-[11px] text-slate-500 uppercase font-sans font-bold">Session</span>
              <span>{formatTimer(sessionSeconds)}</span>
            </div>
          )}
        </div>

        {/* Right: Participant Count & Copy Invite Action */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-lg border border-[#202534] bg-[#12141c] px-2.5 py-1 text-xs text-slate-300">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono font-medium">{participantCount}/2</span>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-lg border border-[#262c3d] bg-[#161924] px-2.5 py-1 text-xs font-semibold text-slate-200 hover:text-white hover:bg-[#1e2333] transition-colors cursor-pointer"
            title="Copy Guest Invite Link"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300 text-xs">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs">Invite</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Floating Coordinated Recording Status / Upload Progress Banner */}
      <div className="pt-2 z-30">
        <RecordingBar
          status={recordingStatus}
          duration={recordingDuration}
          fileSizeMb={fileSizeMb}
          uploadProgress={uploadProgress}
          errorMessage={recordingError}
          localDownloadUrl={localDownloadUrl}
          role={role}
          onDismissError={dismissRecordingError}
        />
      </div>

      {/* Main Studio Video Stage */}
      <main className="relative flex-1 p-3 sm:p-5 md:p-6 overflow-hidden flex flex-col justify-center">
        {/* Case 1: Both Host and Guest Connected */}
        {firstRemoteTrackRef && localTrackRef ? (
          layoutMode === "split" ? (
            /* Side-by-Side Balanced Broadcast Layout */
            <div className="grid h-full w-full grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 max-h-[82vh]">
              <div className="h-full min-h-0">
                <ParticipantTile trackRef={localTrackRef} isLocal={true} />
              </div>
              <div className="h-full min-h-0">
                <ParticipantTile trackRef={firstRemoteTrackRef} isLocal={false} />
              </div>
            </div>
          ) : (
            /* Focus Layout: Remote participant fills stage with Local PIP */
            <div className="relative h-full w-full max-h-[82vh] overflow-hidden rounded-2xl">
              <ParticipantTile trackRef={firstRemoteTrackRef} isLocal={false} isFocused={true} />
              <div className="absolute right-4 bottom-4 h-36 w-52 sm:h-44 sm:w-64 z-10 shadow-2xl ring-2 ring-[#2b3145] rounded-2xl overflow-hidden">
                <ParticipantTile trackRef={localTrackRef} isLocal={true} />
              </div>
            </div>
          )
        ) : localTrackRef ? (
          /* Case 2: Waiting for Guest Layout (Clean balanced studio card) */
          <div className="grid h-full w-full grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 max-h-[82vh]">
            <div className="h-full min-h-0">
              <ParticipantTile trackRef={localTrackRef} isLocal={true} />
            </div>

            {/* Waiting for Guest Slot */}
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-dashed border-[#232736] bg-[#0e1017]/70 p-6 text-center backdrop-blur-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4 animate-pulse">
                <Users className="h-8 w-8 stroke-[1.5]" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                Waiting for Guest to Join
              </h3>
              <p className="max-w-sm text-xs text-slate-400 mb-6 leading-relaxed">
                Your private studio is live. Share this invite link with your interviewee to start the conversation.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-sm">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== "undefined" ? `${window.location.origin}/?room=${roomId}` : roomId}
                  className="w-full rounded-xl border border-[#262c3b] bg-[#0c0e14] px-3.5 py-2 text-xs font-mono text-purple-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Initializing camera/mic stream */
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              <p className="text-sm font-medium text-slate-300">Initializing high-definition media stream...</p>
            </div>
          </div>
        )}
      </main>

      {/* Docked Riverside Media Controls Toolbar */}
      <footer className="shrink-0 p-3 sm:p-5 z-20">
        <div className="mx-auto max-w-4xl">
          <MediaControls
            roomId={roomId}
            layoutMode={layoutMode}
            onLayoutChange={setLayoutMode}
            onLeaveCall={onLeaveCall}
            recordingStatus={recordingStatus}
            recordingDuration={recordingDuration}
            role={role}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
          />
        </div>
      </footer>
    </div>
  );
}
