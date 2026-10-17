"use client";

import { useState, useEffect, useCallback } from "react";
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
  Square,
  UploadCloud,
  Maximize2,
  Minimize2,
  Settings,
  X,
  Volume2,
  Sparkles,
  Camera,
  Headphones,
  Radio,
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
  isStreamingLive?: boolean;
  onOpenLiveStream?: () => void;
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
  isStreamingLive = false,
  onOpenLiveStream,
}: MediaControlsProps) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();

  const [copied, setCopied] = useState(false);
  const [isTogglingMic, setIsTogglingMic] = useState(false);
  const [isTogglingCam, setIsTogglingCam] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEnhancerPopover, setShowEnhancerPopover] = useState(false);

  // In-call device switching states
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [selectedMicId, setSelectedMicId] = useState<string>("");
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>("");
  const [isSwitchingDevice, setIsSwitchingDevice] = useState(false);

  const enhancer = useSelfieEnhancer(localParticipant);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Enumerate devices when settings modal opens
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vInputs = devices.filter((d) => d.kind === "videoinput");
      const aInputs = devices.filter((d) => d.kind === "audioinput");
      const aOutputs = devices.filter((d) => d.kind === "audiooutput");

      setVideoDevices(vInputs);
      setAudioInputDevices(aInputs);
      setAudioOutputDevices(aOutputs);

      try {
        const activeCam = room.getActiveDevice("videoinput");
        if (activeCam) setSelectedCameraId(activeCam);
        const activeMic = room.getActiveDevice("audioinput");
        if (activeMic) setSelectedMicId(activeMic);
        const activeSpeaker = room.getActiveDevice("audiooutput");
        if (activeSpeaker) setSelectedSpeakerId(activeSpeaker);
      } catch {
        // fallback
      }
    } catch (err) {
      console.warn("Failed to enumerate devices in studio:", err);
    }
  }, [room]);

  useEffect(() => {
    if (showSettingsModal) {
      refreshDevices();
    }
  }, [showSettingsModal, refreshDevices]);

  const handleSwitchCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (!room || !deviceId) return;
    try {
      setIsSwitchingDevice(true);
      await room.switchActiveDevice("videoinput", deviceId);
    } catch (err) {
      console.error("Failed to switch camera:", err);
    } finally {
      setIsSwitchingDevice(false);
    }
  };

  const handleSwitchMic = async (deviceId: string) => {
    setSelectedMicId(deviceId);
    if (!room || !deviceId) return;
    try {
      setIsSwitchingDevice(true);
      await room.switchActiveDevice("audioinput", deviceId);
    } catch (err) {
      console.error("Failed to switch microphone:", err);
    } finally {
      setIsSwitchingDevice(false);
    }
  };

  const handleSwitchSpeaker = async (deviceId: string) => {
    setSelectedSpeakerId(deviceId);
    if (!room || !deviceId) return;
    try {
      setIsSwitchingDevice(true);
      await room.switchActiveDevice("audiooutput", deviceId);
    } catch (err) {
      console.error("Failed to switch speaker:", err);
    } finally {
      setIsSwitchingDevice(false);
    }
  };

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleLeave = () => {
    const isRecordingNow = recordingStatus === "recording";
    const confirmMsg = isRecordingNow
      ? "Recording is currently active! If you leave now, the recording session will end immediately. Are you sure you want to exit?"
      : "Are you sure you want to exit the studio session?";

    if (confirm(confirmMsg)) {
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
    const inviteUrl = `${origin}/join?code=${encodeURIComponent(roomId)}`;
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
          "flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-[#1f242e] bg-[#0f1115]/95 p-2.5 sm:px-5 sm:py-2.5 shadow-2xl backdrop-blur-md select-none",
          className
        )}
      >
        {/* Left Section: Connection Status & Copy Guest Invite */}
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2.5">
          <ConnectionStatusBadge />

          <button
            type="button"
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 rounded-lg border border-[#242a36] bg-[#14171d] px-3 py-1.5 text-xs font-semibold text-[#d1d5db] hover:text-white hover:bg-[#1a1e26] transition-colors cursor-pointer"
            title="Copy Guest Invite Link"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#10b981]" />
                <span className="text-[#10b981]">Invite Copied</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-[#8c94a4]" />
                <span>Invite Guest</span>
              </>
            )}
          </button>
        </div>

        {/* Center Section: Primary Recording Toolbar */}
        <div className="flex items-center gap-2">
          {/* Microphone Toggle */}
          <button
            type="button"
            onClick={toggleMic}
            disabled={isTogglingMic}
            className={cn(
              "flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border transition-all active:scale-[0.96] cursor-pointer",
              isMicrophoneEnabled
                ? "border-[#242a36] bg-[#14171d] text-[#d1d5db] hover:bg-[#1c202a] hover:text-white"
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
              "flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border transition-all active:scale-[0.96] cursor-pointer",
              isCameraEnabled
                ? "border-[#242a36] bg-[#14171d] text-[#d1d5db] hover:bg-[#1c202a] hover:text-white"
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

          {/* Camera Enhancer */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEnhancerPopover(!showEnhancerPopover)}
              className={cn(
                "flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border transition-all active:scale-[0.96] cursor-pointer relative",
                enhancer.isEnabled
                  ? "border-[#c0915a] bg-[#c0915a]/20 text-[#cf9f67] shadow-sm"
                  : "border-[#242a36] bg-[#14171d] text-[#8c94a4] hover:bg-[#1c202a] hover:text-white"
              )}
              title={
                enhancer.isEnabled
                  ? `Camera Enhancer Active (${enhancer.strength}%) • Click to adjust`
                  : "Camera Enhancer"
              }
              aria-label="Camera Enhancer"
            >
              <Sparkles className="h-4.5 w-4.5" />
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

          {/* Layout Switcher */}
          <button
            type="button"
            onClick={() => onLayoutChange(layoutMode === "split" ? "focus" : "split")}
            className={cn(
              "hidden md:flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border border-[#242a36] bg-[#14171d] text-[#8c94a4] transition-all hover:bg-[#1c202a] hover:text-white active:scale-[0.96] cursor-pointer",
              layoutMode === "focus" && "border-[#c0915a] text-[#cf9f67] bg-[#c0915a]/15"
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

          {/* Riverside Record Button */}
          {role === "host" ? (
            isRecording ? (
              <button
                type="button"
                onClick={onStopRecording}
                className="flex items-center gap-2 rounded-lg border border-rose-500 bg-rose-600 px-4 sm:px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-rose-500 active:scale-[0.96] transition-all cursor-pointer animate-pulse"
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
                className="flex items-center gap-2 rounded-lg border border-[#ef4444]/60 bg-[#1e1113] hover:bg-[#2b1418] text-white px-4 sm:px-5 py-2.5 text-xs font-bold shadow-md hover:border-[#ef4444] active:scale-[0.96] disabled:opacity-50 transition-all cursor-pointer"
                title="Start Isolated Multi-Track Recording for Host & Guest"
              >
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                <span className="text-[12px] font-bold uppercase tracking-wider text-rose-200">Record</span>
              </button>
            )
          ) : (
            /* Guest View */
            isRecording ? (
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/50 bg-rose-950/60 px-4 py-2 text-xs font-bold text-rose-300 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Recording ({formatTimer(recordingDuration)})</span>
              </div>
            ) : isUploading ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-950/60 px-3.5 py-2 text-xs font-semibold text-amber-300">
                <UploadCloud className="h-3.5 w-3.5 animate-bounce" />
                <span>Saving Track...</span>
              </div>
            ) : (
              <div
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#1f242e] bg-[#111318] px-3.5 py-1.5 text-xs text-[#8c94a4]"
                title="Host coordinates studio recording"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#6b7280]" />
                <span className="text-[11px] font-medium">Host Controls REC</span>
              </div>
            )
          )}

          {/* RTMP Live Streaming Trigger (Host Only) */}
          {role === "host" && onOpenLiveStream && (
            <button
              type="button"
              onClick={onOpenLiveStream}
              className={cn(
                "hidden sm:flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all active:scale-[0.96] cursor-pointer",
                isStreamingLive
                  ? "border-rose-500 bg-rose-950/70 text-rose-300 animate-pulse"
                  : "border-[#242a36] bg-[#14171d] text-[#8c94a4] hover:bg-[#1c202a] hover:text-white"
              )}
              title="Configure Multi-Destination Live Stream (YouTube, Twitch, Facebook, Custom RTMP)"
            >
              <Radio className="h-3.5 w-3.5" />
              <span>{isStreamingLive ? "Live" : "Stream"}</span>
            </button>
          )}

          {/* Device Settings */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border border-[#242a36] bg-[#14171d] text-[#8c94a4] hover:bg-[#1c202a] hover:text-white transition-all active:scale-[0.96] cursor-pointer"
            title="Studio Settings & Device Selection"
            aria-label="Studio Settings"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border border-[#242a36] bg-[#14171d] text-[#8c94a4] hover:bg-[#1c202a] hover:text-white transition-all active:scale-[0.96] cursor-pointer"
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
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border border-rose-800 bg-rose-600 text-white shadow-md transition-all hover:bg-rose-500 active:scale-[0.96] cursor-pointer"
            title="Leave Studio"
            aria-label="Leave Studio"
          >
            <PhoneOff className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Device Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[#242a36] bg-[#13161c] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1a1e26] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#c0915a]" />
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-white">
                  Studio Audio & Video Settings
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-[#8c94a4] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Camera Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8c94a4] mb-1 flex items-center gap-1.5">
                  <Camera className="h-3 w-3 text-[#c0915a]" />
                  <span>Camera Device</span>
                </label>
                <select
                  value={selectedCameraId}
                  disabled={isSwitchingDevice}
                  onChange={(e) => handleSwitchCamera(e.target.value)}
                  className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-[#d1d5db] focus:border-[#c0915a] focus:outline-none"
                >
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                  {videoDevices.length === 0 && <option value="">Default Camera</option>}
                </select>
              </div>

              {/* Microphone Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8c94a4] mb-1 flex items-center gap-1.5">
                  <Mic className="h-3 w-3 text-[#c0915a]" />
                  <span>Microphone Device</span>
                </label>
                <select
                  value={selectedMicId}
                  disabled={isSwitchingDevice}
                  onChange={(e) => handleSwitchMic(e.target.value)}
                  className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-[#d1d5db] focus:border-[#c0915a] focus:outline-none"
                >
                  {audioInputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                  {audioInputDevices.length === 0 && <option value="">Default Microphone</option>}
                </select>
              </div>

              {/* Output Speaker Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8c94a4] mb-1 flex items-center gap-1.5">
                  <Volume2 className="h-3 w-3 text-[#c0915a]" />
                  <span>Audio Output / Speaker</span>
                </label>
                <select
                  value={selectedSpeakerId}
                  disabled={isSwitchingDevice}
                  onChange={(e) => handleSwitchSpeaker(e.target.value)}
                  className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-[#d1d5db] focus:border-[#c0915a] focus:outline-none"
                >
                  {audioOutputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Speaker ${d.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                  {audioOutputDevices.length === 0 && <option value="">System Default Audio</option>}
                </select>
              </div>

              {/* Multi-Track Recording Info */}
              <div className="rounded-lg border border-[#1f242e] bg-[#0c0e12] p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#d1d5db] font-semibold text-[11px]">
                  <Headphones className="h-3.5 w-3.5 text-[#c0915a]" />
                  <span>Isolated Local Capture</span>
                </div>
                <p className="text-[11px] text-[#8c94a4] leading-relaxed">
                  Your audio and video are recorded directly from your local hardware device before network compression, providing pristine studio-quality stems.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] py-2 text-xs font-bold text-[#0a0b0e] cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
