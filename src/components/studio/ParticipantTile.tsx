"use client";

import { useMemo } from "react";
import { VideoTrack, isTrackReference, type TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Mic, MicOff, VideoOff, Signal, Sparkles } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Track } from "livekit-client";
import { useSelfieEnhancer } from "@/hooks/useSelfieEnhancer";

interface ParticipantTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  isLocal?: boolean;
  className?: string;
  isFocused?: boolean;
}

export function ParticipantTile({
  trackRef,
  isLocal = false,
  className,
  isFocused = false,
}: ParticipantTileProps) {
  const participant = trackRef.participant;
  const isSpeaking = participant?.isSpeaking ?? false;
  const isScreenShare = trackRef.source === Track.Source.ScreenShare;

  const isCameraEnabled =
    isTrackReference(trackRef) &&
    trackRef.publication.isMuted === false &&
    !!trackRef.publication.track;
  const isMicrophoneMuted = participant?.isMicrophoneEnabled === false;
  const enhancer = useSelfieEnhancer();

  // Extract role from participant metadata or name
  const role = useMemo(() => {
    try {
      if (participant?.metadata) {
        const parsed = JSON.parse(participant.metadata);
        if (parsed.role) return parsed.role as "host" | "guest";
      }
    } catch {
      // fallback
    }
    return (participant?.identity?.startsWith("host-") || participant?.name?.toLowerCase().includes("host"))
      ? "host"
      : "guest";
  }, [participant?.metadata, participant?.identity, participant?.name]);

  const displayName = isScreenShare
    ? `${participant?.name || "Participant"}'s Screen`
    : participant?.name || participant?.identity || (isLocal ? "You" : "Participant");
  const initials = getInitials(displayName);

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center justify-center overflow-hidden rounded-xl bg-[#0e1015] border transition-all duration-300 select-none",
        isSpeaking
          ? "border-[#c0915a] shadow-lg ring-1 ring-[#c0915a]/40"
          : "border-[#1f242e] shadow-md hover:border-[#2a313e]",
        isFocused ? "w-full h-full" : "w-full h-full",
        className
      )}
    >
      {/* Active Video / ScreenShare Track */}
      {isCameraEnabled && isTrackReference(trackRef) ? (
        <div className="relative h-full w-full overflow-hidden bg-black flex items-center justify-center">
          <VideoTrack
            trackRef={trackRef}
            className={cn(
              "h-full w-full object-cover transition-transform duration-300",
              isLocal && !isScreenShare && "scale-x-[-1]"
            )}
          />

          {/* Local Camera Enhancer Indicator */}
          {isLocal && enhancer.isEnabled && !isScreenShare && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-md bg-[#0a0b0e]/90 px-2 py-0.5 text-[10px] font-semibold text-[#cf9f67] border border-[#c0915a]/30 backdrop-blur-sm pointer-events-none">
              <Sparkles className="h-3 w-3 text-[#c0915a]" />
              <span>Enhancer {enhancer.strength}%</span>
            </div>
          )}

          {/* Compare Mode Split Tags */}
          {isLocal && enhancer.isEnabled && enhancer.compareMode && !isScreenShare && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 pointer-events-none">
              <span className="rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700 backdrop-blur-sm">
                Raw
              </span>
              <span className="rounded bg-[#0a0b0e]/85 px-1.5 py-0.5 text-[10px] font-bold text-[#82a4d4] border border-[#4c6a92]/50 backdrop-blur-sm">
                Enhanced
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Camera Off / Audio Only Studio Placeholder */
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-[#0e1015]">
          <div className="relative flex items-center justify-center">
            {isSpeaking && (
              <span className="absolute -inset-4 rounded-full bg-[#c0915a]/20 blur-md animate-pulse" />
            )}
            <div
              className={cn(
                "relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl border text-lg sm:text-xl font-bold tracking-wider text-white shadow-md transition-all duration-200",
                role === "host"
                  ? "bg-[#1f242e] border-[#c0915a]/40 text-[#cf9f67]"
                  : "bg-[#141a24] border-[#4c6a92]/40 text-[#82a4d4]"
              )}
            >
              {initials}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-[#8c94a4] font-medium">
            <VideoOff className="h-3.5 w-3.5" />
            <span>Camera muted</span>
          </div>
        </div>
      )}

      {/* Floating Bottom Name & Audio Indicator (Riverside Name Tag) */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-lg bg-[#0a0b0e]/90 px-2.5 py-1 backdrop-blur-md border border-[#1f242e] shadow-md">
          {/* Mic Status */}
          <div
            className={cn(
              "flex h-4.5 w-4.5 items-center justify-center rounded text-xs transition-colors",
              isMicrophoneMuted
                ? "bg-rose-500/20 text-rose-400"
                : isSpeaking
                ? "bg-[#c0915a]/25 text-[#cf9f67] animate-pulse"
                : "bg-[#1a1e26] text-[#8c94a4]"
            )}
          >
            {isMicrophoneMuted ? (
              <MicOff className="h-3 w-3" />
            ) : (
              <Mic className="h-3 w-3" />
            )}
          </div>

          <span className="text-xs font-semibold text-white truncate max-w-[150px] sm:max-w-[200px]">
            {displayName}
          </span>

          <span
            className={cn(
              "rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider",
              isScreenShare
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : role === "host"
                ? "bg-[#c0915a]/15 text-[#cf9f67] border border-[#c0915a]/30"
                : "bg-[#4c6a92]/15 text-[#82a4d4] border border-[#4c6a92]/30"
            )}
          >
            {isScreenShare ? "SCREEN" : role}
          </span>
        </div>

        {/* Quality indicator */}
        <div className="rounded bg-[#0a0b0e]/85 px-2 py-0.5 backdrop-blur-md border border-[#1f242e] flex items-center gap-1.5 text-[10px] font-mono font-medium text-[#d1d5db]">
          <Signal className="h-3 w-3 text-[#10b981]" />
          <span>{isLocal ? "1080p Local Track" : "HD Stream"}</span>
        </div>
      </div>
    </div>
  );
}
