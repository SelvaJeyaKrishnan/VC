"use client";

import { useMemo } from "react";
import { VideoTrack, isTrackReference, type TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Mic, MicOff, VideoOff, Signal, Monitor, Sparkles } from "lucide-react";
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

  // Extract role from participant metadata or name if available
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
        "group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#0c0d14] border transition-all duration-300 select-none",
        isSpeaking
          ? "border-purple-500/90 shadow-2xl shadow-purple-950/40 ring-2 ring-purple-500/40"
          : "border-[#202434] shadow-xl hover:border-[#2b3145]",
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
              isLocal && !isScreenShare && "scale-x-[-1]" // Mirror local camera preview for natural feeling
            )}
          />

          {/* Local Selfie Enhancer Indicator */}
          {isLocal && enhancer.isEnabled && !isScreenShare && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-purple-950/80 px-2.5 py-1 text-[10px] font-semibold text-purple-200 border border-purple-500/40 backdrop-blur-md shadow-lg pointer-events-none">
              <Sparkles className="h-3 w-3 text-purple-400 animate-pulse" />
              <span>Beauty Enhancer ({enhancer.strength}%)</span>
            </div>
          )}

          {/* Compare Mode Split Tags */}
          {isLocal && enhancer.isEnabled && enhancer.compareMode && !isScreenShare && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 pointer-events-none">
              <span className="rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700 backdrop-blur-sm">
                Raw
              </span>
              <span className="rounded-md bg-purple-950/85 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/50 backdrop-blur-sm">
                Enhanced
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Camera Off / Audio Only Studio Placeholder */
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#11131c] to-[#0c0d14]">
          <div className="relative flex items-center justify-center">
            {isSpeaking && (
              <span className="absolute -inset-5 rounded-full bg-purple-500/25 blur-xl animate-pulse" />
            )}
            <div
              className={cn(
                "relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl border text-xl sm:text-2xl font-bold tracking-wider text-white shadow-2xl transition-all duration-200",
                role === "host"
                  ? "bg-gradient-to-br from-purple-800 to-indigo-950 border-purple-500/40 shadow-purple-950/70"
                  : "bg-gradient-to-br from-cyan-800 to-slate-950 border-cyan-500/40 shadow-cyan-950/70"
              )}
            >
              {initials}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <VideoOff className="h-3.5 w-3.5" />
            <span>Camera muted</span>
          </div>
        </div>
      )}

      {/* Floating Bottom Name & Audio Indicator (Riverside Studio Card) */}
      <div className="pointer-events-none absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-xl bg-[#0c0e14]/90 px-3 py-1.5 backdrop-blur-md border border-[#252a3b] shadow-xl">
          {/* Mic Status */}
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-md text-xs transition-colors",
              isMicrophoneMuted
                ? "bg-rose-500/20 text-rose-400"
                : isSpeaking
                ? "bg-purple-500/25 text-purple-300 animate-pulse"
                : "bg-slate-800 text-slate-400"
            )}
          >
            {isMicrophoneMuted ? (
              <MicOff className="h-3 w-3" />
            ) : (
              <Mic className="h-3 w-3" />
            )}
          </div>

          <span className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">
            {displayName}
          </span>

          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
              isScreenShare
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : role === "host"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
            )}
          >
            {isScreenShare ? "SCREEN" : role}
          </span>
        </div>

        {/* Quality indicator */}
        <div className="rounded-lg bg-[#0c0e14]/85 px-2.5 py-1 backdrop-blur-md border border-[#252a3b] flex items-center gap-1.5 text-[10px] font-mono font-medium text-slate-300 shadow-lg">
          <Signal className="h-3 w-3 text-emerald-400" />
          <span>{isLocal ? "1080p Local Track" : "HD Stream"}</span>
        </div>
      </div>
    </div>
  );
}
