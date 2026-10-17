"use client";

import { useState, useEffect, useRef } from "react";
import {
  useTracks,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Radio, Users, Copy, Check, FileText, WifiOff, CheckCircle2 } from "lucide-react";
import { ParticipantTile } from "./ParticipantTile";
import { MediaControls } from "./MediaControls";
import { RecordingBar } from "./RecordingBar";
import { Teleprompter } from "./Teleprompter";
import { LiveStreamModal } from "./LiveStreamModal";
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
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [showLiveStreamModal, setShowLiveStreamModal] = useState(false);
  const [isStreamingLive, setIsStreamingLive] = useState(false);

  // Guest disconnect & reconnect tracking
  const [guestDisconnected, setGuestDisconnected] = useState(false);
  const [guestReconnectedNotice, setGuestReconnectedNotice] = useState(false);
  const hadRemoteParticipantRef = useRef(false);

  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  // Role deduction
  const role: "host" | "guest" =
    initialRole ||
    (localParticipant?.identity?.startsWith("host-") ||
    localParticipant?.name?.toLowerCase().includes("host")
      ? "host"
      : "guest");

  // Track guest connections and disconnections
  useEffect(() => {
    if (remoteParticipants.length > 0) {
      if (guestDisconnected) {
        setGuestDisconnected(false);
        setGuestReconnectedNotice(true);
        const timer = setTimeout(() => setGuestReconnectedNotice(false), 4000);
        return () => clearTimeout(timer);
      }
      hadRemoteParticipantRef.current = true;
    } else if (hadRemoteParticipantRef.current && remoteParticipants.length === 0) {
      setGuestDisconnected(true);
    }
  }, [remoteParticipants.length, guestDisconnected]);

  // Multi-Track Recording Engine
  const {
    status: recordingStatus,
    duration: recordingDuration,
    fileSizeMb,
    uploadProgress,
    errorMessage: recordingError,
    warningMessage: recordingWarning,
    localDownloadUrl,
    recordedTracks,
    missingWarning,
    startRecording,
    stopRecording,
    dismissError: dismissRecordingError,
    dismissWarning: dismissRecordingWarning,
    dismissMissingWarning,
  } = useLocalRecorder({
    room,
    localParticipant,
    remoteParticipants,
    roomId,
    role,
    displayName: localParticipant?.name || (role === "host" ? "Creator Host" : "Guest"),
  });

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

  const localTrackRef = trackReferences.find(
    (t) => t.participant.identity === localParticipant?.identity
  );

  const remoteTrackRefs = trackReferences.filter(
    (t) => t.participant.identity !== localParticipant?.identity
  );
  const firstRemoteTrackRef = remoteTrackRefs[0];

  const participantCount = (localParticipant ? 1 : 0) + remoteParticipants.length;

  const handleCopyLink = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/join?code=${encodeURIComponent(roomId)}`;
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
    <div className="flex h-[100dvh] w-full flex-col bg-[#0a0b0e] text-[#f3f4f6] overflow-hidden select-none antialiased">
      {/* Studio Top Navigation Bar (Riverside Dark Studio Bar) */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1a1e26] bg-[#0f1115]/95 px-4 sm:px-6 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#c0915a] text-[#0a0b0e] font-bold">
              <Radio className="h-3.5 w-3.5" />
            </div>
            <span className="font-heading font-bold text-white text-sm hidden sm:inline">OneGuest</span>
            <span className="text-[#4b5563] hidden sm:inline">/</span>
            <span className="text-xs sm:text-sm font-semibold text-[#e5e7eb] truncate max-w-[150px] sm:max-w-[240px]">
              {roomName || roomId}
            </span>
          </div>
        </div>

        {/* Center: Live Studio Session Status / Active Recording / Live Stream Pill */}
        <div className="flex items-center gap-2">
          {isStreamingLive && (
            <div className="flex items-center gap-1.5 rounded-full border border-rose-500/70 bg-rose-950/80 px-3 py-1 text-xs font-bold text-rose-300 shadow-md animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-[10px] uppercase tracking-wider">LIVE STREAM</span>
            </div>
          )}

          {isActuallyRecording ? (
            <div className="flex items-center gap-2 rounded-full border border-rose-500/60 bg-rose-950/60 px-3.5 py-1 text-xs font-bold text-rose-300 shadow-md animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-[11px] uppercase tracking-wider">REC</span>
              <span className="font-mono">{formatTimer(recordingDuration)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-md border border-[#1f242e] bg-[#13161c] px-3 py-1 font-mono text-xs text-[#d1d5db]">
              <span className="text-[10px] text-[#8c94a4] uppercase font-sans font-bold">Session</span>
              <span>{formatTimer(sessionSeconds)}</span>
            </div>
          )}
        </div>

        {/* Right: Teleprompter, Participant Count & Copy Invite Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTeleprompter((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              showTeleprompter
                ? "border-[#c0915a] bg-[#c0915a]/15 text-[#cf9f67]"
                : "border-[#242a36] bg-[#14171d] text-[#d1d5db] hover:text-white hover:bg-[#1a1e26]"
            }`}
            title="Toggle Script Prompter"
          >
            <FileText className="h-3.5 w-3.5 text-[#c0915a]" />
            <span className="hidden sm:inline text-xs">Prompter</span>
          </button>

          <div className="flex items-center gap-1.5 rounded-md border border-[#1f242e] bg-[#13161c] px-2.5 py-1 text-xs text-[#d1d5db]">
            <Users className="h-3.5 w-3.5 text-[#8c94a4]" />
            <span className="font-mono font-medium">{participantCount} in Studio</span>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-md border border-[#242a36] bg-[#14171d] px-2.5 py-1 text-xs font-semibold text-[#d1d5db] hover:text-white hover:bg-[#1a1e26] transition-colors cursor-pointer"
            title="Copy Guest Invite Link"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#10b981]" />
                <span className="text-[#10b981] text-xs">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#8c94a4]" />
                <span className="text-xs">Invite</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Floating In-Studio Script Prompter */}
      <Teleprompter
        roomId={roomId}
        isOpen={showTeleprompter}
        onClose={() => setShowTeleprompter(false)}
      />

      {/* Guest Disconnect / Reconnect Banner */}
      {guestDisconnected && (
        <div className="bg-[#1c140d] border-b border-[#3b2a1a] px-4 py-2 text-xs text-[#f3d9b8] flex items-center justify-center gap-2 z-30 animate-pulse">
          <WifiOff className="h-4 w-4 text-[#c0915a] shrink-0" />
          <span>Participant disconnected. Separate audio/video stems remain preserved.</span>
        </div>
      )}

      {guestReconnectedNotice && (
        <div className="bg-[#0e1f18] border-b border-[#134e35] px-4 py-2 text-xs text-[#a7f3d0] flex items-center justify-center gap-2 z-30">
          <CheckCircle2 className="h-4 w-4 text-[#10b981] shrink-0" />
          <span>Participant reconnected! Studio stage feeds are live.</span>
        </div>
      )}

      {/* Coordinated Recording Status / Upload Progress Banner */}
      <div className="pt-2 z-30">
        <RecordingBar
          status={recordingStatus}
          duration={recordingDuration}
          fileSizeMb={fileSizeMb}
          uploadProgress={uploadProgress}
          errorMessage={recordingError}
          warningMessage={recordingWarning}
          localDownloadUrl={localDownloadUrl}
          recordedTracks={recordedTracks}
          missingWarning={missingWarning}
          role={role}
          onDismissError={dismissRecordingError}
          onDismissWarning={dismissRecordingWarning}
          onDismissMissingWarning={dismissMissingWarning}
          onConfirmSoloRecording={() => startRecording(true)}
        />
      </div>

      {/* Main Studio Video Stage */}
      <main className="relative flex-1 p-3 sm:p-5 md:p-6 overflow-hidden flex flex-col justify-center">
        {/* Case 1: Multiple Remote Participants Connected (3+ participants) */}
        {remoteTrackRefs.length > 1 && localTrackRef ? (
          <div
            className={`grid h-full w-full gap-3 sm:gap-4 max-h-[82vh] ${
              remoteTrackRefs.length === 2
                ? "grid-cols-1 md:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"
            }`}
          >
            <div className="h-full min-h-0">
              <ParticipantTile trackRef={localTrackRef} isLocal={true} />
            </div>
            {remoteTrackRefs.map((rRef) => (
              <div key={rRef.participant.identity} className="h-full min-h-0">
                <ParticipantTile trackRef={rRef} isLocal={false} />
              </div>
            ))}
          </div>
        ) : firstRemoteTrackRef && localTrackRef ? (
          /* Case 2: 1 Host + 1 Guest Connected */
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
            <div className="relative h-full w-full max-h-[82vh] overflow-hidden rounded-xl">
              <ParticipantTile trackRef={firstRemoteTrackRef} isLocal={false} isFocused={true} />
              <div className="absolute right-4 bottom-4 h-36 w-52 sm:h-44 sm:w-64 z-10 shadow-2xl ring-2 ring-[#242a36] rounded-xl overflow-hidden">
                <ParticipantTile trackRef={localTrackRef} isLocal={true} />
              </div>
            </div>
          )
        ) : localTrackRef ? (
          /* Case 2: Waiting for Guest Layout */
          <div className="grid h-full w-full grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 max-h-[82vh]">
            <div className="h-full min-h-0">
              <ParticipantTile trackRef={localTrackRef} isLocal={true} />
            </div>

            {/* Waiting for Guest Slot */}
            <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-xl border border-dashed border-[#1f242e] bg-[#0f1115]/80 p-6 text-center backdrop-blur-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#c0915a]/10 text-[#c0915a] border border-[#c0915a]/20 mb-4 animate-pulse">
                <Users className="h-7 w-7 stroke-[1.5]" />
              </div>

              <h3 className="font-heading text-base sm:text-lg font-bold text-white mb-1">
                Waiting for Guest to Join
              </h3>
              <p className="max-w-sm text-xs text-[#8c94a4] mb-6 leading-relaxed">
                Your private studio is live. Share this invite link with your interviewee to start the conversation.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-sm">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== "undefined" ? `${window.location.origin}/join?code=${roomId}` : roomId}
                  className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3.5 py-2 text-xs font-mono text-[#cf9f67] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] px-4 py-2 text-xs font-bold text-[#0a0b0e] transition-colors cursor-pointer"
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
          /* Initializing stream */
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c0915a] border-t-transparent" />
              <p className="text-xs font-medium text-[#8c94a4]">Initializing high-definition media stream...</p>
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
            isStreamingLive={isStreamingLive}
            onOpenLiveStream={() => setShowLiveStreamModal(true)}
          />
        </div>
      </footer>

      {/* RTMP Multi-Destination Live Streaming Modal */}
      <LiveStreamModal
        roomId={roomId}
        isOpen={showLiveStreamModal}
        onClose={() => setShowLiveStreamModal(false)}
        onStreamStateChange={setIsStreamingLive}
      />
    </div>
  );
}
