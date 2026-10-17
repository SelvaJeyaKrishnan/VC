"use client";

import { useState, useEffect } from "react";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Share2,
  Check,
  LayoutGrid,
  Columns2,
  Disc,
  Square,
  UploadCloud,
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
  Settings,
  X,
  Volume2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { SelfieEnhancerControl } from "./SelfieEnhancerControl";
import { useSelfieEnhancer } from "@/hooks/useSelfieEnhancer";
import type { StudioLayoutMode } from "@/types/studio";
import type { RecordingStatus } from "@/hooks/useLocalRecorder";

interface MediaControlsProps {
  roomId: string;
  layoutMode: StudioLayoutMode;
  onLayoutChange: (mode: StudioLayoutMode) => void;
  onLeaveCall?: () => void;
  className?: string;
  recordingStatus?: RecordingStatus;
  recordingDuration?: number;
  role?: "host" | "guest";
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export function MediaControls({
  roomId,
  layoutMode,
  onLayoutChange,
  onLeaveCall,
  className,
  recordingStatus = "idle",
  recordingDuration = 0,
  role = "host",
  onStartRecording,
  onStopRecording,
}: MediaControlsProps) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();

  const [copied, setCopied] = useState(false);
  const [isTogglingMic, setIsTogglingMic] = useState(false);
  const [isTogglingCam, setIsTogglingCam] = useState(false);
  const [isTogglingScreen, setIsTogglingScreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEnhancerPopover, setShowEnhancerPopover] = useState(false);

  const enhancer = useSelfieEnhancer(localParticipant);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleMic = async () => {
    if (!localParticipant || isTogglingMic) return;
    try {
      setIsTogglingMic(true);
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (err) {
      console.error("Failed to toggle microphone:", err);
    } finally {
      setIsTogglingMic(false);
    }
  };

  const toggleCam = async () => {
    if (!localParticipant || isTogglingCam) return;
    try {
      setIsTogglingCam(true);
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (err) {
      console.error("Failed to toggle camera:", err);
    } finally {
      setIsTogglingCam(false);
    }
  };

  const toggleScreenShare = async () => {
    if (!localParticipant || isTogglingScreen) return;
    try {
      setIsTogglingScreen(true);
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (err) {
      console.error("Failed to toggle screen share:", err);
    } finally {
      setIsTogglingScreen(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleLeave = () => {
    if (confirm("Are you sure you want to exit the studio session?")) {
      room.disconnect();
      if (onLeaveCall) {
        onLeaveCall();
      } else {
        window.location.href = "/";
      }
    }
  };

  const copyInviteLink = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/?room=${encodeURIComponent(roomId)}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt("Copy Guest Invite Link:", inviteUrl);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isRecording = recordingStatus === "recording";
  const isUploading = recordingStatus === "uploading";

  return (
    <>
      <div
        className={cn(
          "flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[#232736] bg-[#11131c]/95 p-3 sm:px-6 sm:py-3 shadow-2xl backdrop-blur-2xl select-none",
          className
        )}
      >
        {/* Left Section: Connection State & Invite Action */}
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-3">
          <ConnectionStatusBadge />

          <button
            type="button"
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 rounded-xl border border-[#262c3d] bg-[#171a25] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#1f2332] transition-colors cursor-pointer"
            title="Copy Guest Invite Link"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300">Invite Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Invite Guest</span>
              </>
            )}
          </button>
        </div>

        {/* Center Section: Primary Recording Toolbar */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Microphone Toggle */}
          <button
            type="button"
            onClick={toggleMic}
            disabled={isTogglingMic}
            className={cn(
              "flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border transition-all active:scale-[0.96] cursor-pointer",
              isMicrophoneEnabled
                ? "border-[#2b3144] bg-[#1a1e2b] text-slate-200 hover:bg-[#23283a] hover:text-white shadow-md"
                : "border-rose-900/80 bg-rose-950/70 text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-900/80"
            )}
            title={isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"}
            aria-label={isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicrophoneEnabled ? (
              <Mic className="h-4.5 w-4.5" />
            ) : (
              <MicOff className="h-4.5 w-4.5 text-rose-400" />
            )}
          </button>

          {/* Camera Toggle */}
          <button
            type="button"
            onClick={toggleCam}
            disabled={isTogglingCam}
            className={cn(
              "flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border transition-all active:scale-[0.96] cursor-pointer",
              isCameraEnabled
                ? "border-[#2b3144] bg-[#1a1e2b] text-slate-200 hover:bg-[#23283a] hover:text-white shadow-md"
                : "border-rose-900/80 bg-rose-950/70 text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-900/80"
            )}
            title={isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
            aria-label={isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
          >
            {isCameraEnabled ? (
              <Video className="h-4.5 w-4.5" />
            ) : (
              <VideoOff className="h-4.5 w-4.5 text-rose-400" />
            )}
          </button>

          {/* Screen Share Toggle */}
          <button
            type="button"
            onClick={toggleScreenShare}
            disabled={isTogglingScreen}
            className={cn(
              "flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border transition-all active:scale-[0.96] cursor-pointer",
              isScreenShareEnabled
                ? "border-purple-500/70 bg-purple-600/30 text-purple-300 ring-1 ring-purple-500/40"
                : "border-[#2b3144] bg-[#1a1e2b] text-slate-300 hover:bg-[#23283a] hover:text-white"
            )}
            title={isScreenShareEnabled ? "Stop Sharing Screen" : "Share Screen"}
            aria-label="Toggle Screen Share"
          >
            {isScreenShareEnabled ? (
              <MonitorOff className="h-4.5 w-4.5 text-purple-300" />
            ) : (
              <Monitor className="h-4.5 w-4.5" />
            )}
          </button>

          {/* Selfie Enhancer (Beauty Smoothing & Studio Ring Lighting) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEnhancerPopover(!showEnhancerPopover)}
              className={cn(
                "flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border transition-all active:scale-[0.96] cursor-pointer relative",
                enhancer.isEnabled
                  ? "border-purple-500/80 bg-purple-600/30 text-purple-200 ring-2 ring-purple-500/40 shadow-lg shadow-purple-950/50"
                  : "border-[#2b3144] bg-[#1a1e2b] text-slate-300 hover:bg-[#23283a] hover:text-white"
              )}
              title={
                enhancer.isEnabled
                  ? `Selfie Enhancer Active (${enhancer.strength}%) • Click to adjust`
                  : "Selfie Enhancer (Beauty & Studio Lighting)"
              }
              aria-label="Selfie Enhancer"
            >
              <Sparkles
                className={cn(
                  "h-4.5 w-4.5 transition-colors",
                  enhancer.isEnabled ? "text-purple-300 animate-pulse" : "text-slate-300"
                )}
              />
              {enhancer.isEnabled && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
              )}
            </button>

            {showEnhancerPopover && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 mb-2">
                <SelfieEnhancerControl
                  config={enhancer.config}
                  onToggleEnabled={enhancer.toggleEnabled}
                  onSetStrength={enhancer.setStrength}
                  onSetLighting={enhancer.setLighting}
                  onSetSkinSmooth={enhancer.setSkinSmooth}
                  onToggleCompare={enhancer.toggleCompareMode}
                  onClose={() => setShowEnhancerPopover(false)}
                  variant="popover"
                />
              </div>
            )}
          </div>

          {/* Layout Switcher (Split vs Focus) */}
          <button
            type="button"
            onClick={() => onLayoutChange(layoutMode === "split" ? "focus" : "split")}
            className={cn(
              "hidden md:flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-[#2b3144] bg-[#1a1e2b] text-slate-300 transition-all hover:bg-[#23283a] hover:text-white active:scale-[0.96] cursor-pointer",
              layoutMode === "focus" && "border-purple-500/60 text-purple-300 bg-purple-950/25"
            )}
            title={layoutMode === "split" ? "Switch to Focus Layout" : "Switch to Side-by-Side Split"}
            aria-label="Toggle Layout"
          >
            {layoutMode === "split" ? (
              <Columns2 className="h-4.5 w-4.5" />
            ) : (
              <LayoutGrid className="h-4.5 w-4.5" />
            )}
          </button>

          {/* Riverside Centerpiece: Prominent Record Control */}
          {role === "host" ? (
            isRecording ? (
              <button
                type="button"
                onClick={onStopRecording}
                className="flex items-center gap-2 rounded-full border-2 border-rose-500 bg-rose-600 px-4 sm:px-5 py-2.5 text-xs font-bold text-white shadow-xl shadow-rose-950/60 hover:bg-rose-500 active:scale-[0.96] transition-all cursor-pointer animate-pulse"
                title="Stop Multi-Track Studio Recording"
              >
                <Square className="h-3.5 w-3.5 fill-white" />
                <span className="font-mono">{formatTimer(recordingDuration)}</span>
                <span className="hidden sm:inline text-[11px] font-extrabold uppercase tracking-wider">STOP REC</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartRecording}
                disabled={isUploading}
                className="flex items-center gap-2 rounded-full border-2 border-rose-500/60 bg-[#1c1216] hover:bg-rose-950/60 text-white px-4 sm:px-5 py-2.5 text-xs font-bold shadow-xl shadow-rose-950/30 hover:border-rose-400 active:scale-[0.96] disabled:opacity-50 transition-all cursor-pointer"
                title="Start Isolated Multi-Track Recording for Host & Guest"
              >
                <span className="flex h-3 w-3 rounded-full bg-rose-500 ring-2 ring-rose-500/40" />
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-rose-200">Record</span>
              </button>
            )
          ) : (
            /* Guest View */
            isRecording ? (
              <div className="flex items-center gap-2 rounded-full border border-rose-500/50 bg-rose-950/60 px-4 py-2 text-xs font-bold text-rose-300 animate-pulse">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span>Recording Track ({formatTimer(recordingDuration)})</span>
              </div>
            ) : isUploading ? (
              <div className="flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-950/60 px-3.5 py-2 text-xs font-semibold text-amber-300">
                <UploadCloud className="h-3.5 w-3.5 animate-bounce" />
                <span>Saving Track...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onStartRecording}
                className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#161822] px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                title="Trigger local backup recording"
              >
                <Disc className="h-3.5 w-3.5 text-slate-400" />
                <span>Local REC</span>
              </button>
            )
          )}

          {/* In-Studio Hardware Settings */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-[#2b3144] bg-[#1a1e2b] text-slate-300 hover:bg-[#23283a] hover:text-white transition-all active:scale-[0.96] cursor-pointer"
            title="Studio Settings"
            aria-label="Studio Settings"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-[#2b3144] bg-[#1a1e2b] text-slate-300 hover:bg-[#23283a] hover:text-white transition-all active:scale-[0.96] cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4.5 w-4.5" />
            ) : (
              <Maximize2 className="h-4.5 w-4.5" />
            )}
          </button>

          {/* Leave Studio Call */}
          <button
            type="button"
            onClick={handleLeave}
            className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-rose-800/80 bg-rose-600 text-white shadow-lg shadow-rose-950/50 transition-all hover:bg-rose-500 active:scale-[0.96] cursor-pointer"
            title="Leave Studio Session"
            aria-label="Leave Studio Session"
          >
            <PhoneOff className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Right Section: Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            OneGuest Studio
          </span>
        </div>
      </div>

      {/* In-Studio Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#282d3d] bg-[#13151f] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#232736] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Studio Settings & Hardware
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-[#232736] bg-[#0c0d14] p-3 space-y-2">
                <span className="font-semibold text-slate-300 block">Session Information</span>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Room Identifier:</span>
                  <span className="font-mono font-bold text-purple-300">{roomId}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Participant Role:</span>
                  <span className="uppercase font-bold text-slate-200">{role}</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#232736] bg-[#0c0d14] p-3 space-y-2">
                <span className="font-semibold text-slate-300 block">Media Controls Guide</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Screen sharing, camera, and microphone toggles transmit in high-definition WebRTC without downscaling. Multi-track recording captures local streams directly before network compression.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-bold text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
