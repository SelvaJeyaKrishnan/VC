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
  Disc,
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

      // Active devices from LiveKit room if available
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
          "flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[#232736] bg-[#11131c]/95 p-3 sm:px-6 sm:py-3 shadow-2xl backdrop-blur-2xl select-none",
          className
        )}
      >
        {/* Left Section: Connection Status & Copy Guest Invite */}
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

        {/* Center Section: Primary Recording Toolbar (Minimal, Uncluttered) */}
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

          {/* Selfie Enhancer (Beauty Smoothing & Lighting) */}
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
                  : "Selfie Enhancer (Lighting & Smoothing)"
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
              <div
                className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#232736] bg-[#12141c] px-3.5 py-1.5 text-xs text-slate-400"
                title="Host coordinates studio recording"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                <span className="text-[11px] font-medium">Host Controls REC</span>
              </div>
            )
          )}

          {/* In-Studio Hardware & Device Settings */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-[#2b3144] bg-[#1a1e2b] text-slate-300 hover:bg-[#23283a] hover:text-white transition-all active:scale-[0.96] cursor-pointer"
            title="Studio Settings & Device Selection"
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
      </div>

      {/* In-Studio Hardware & Device Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#282d3d] bg-[#13151f] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#232736] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Studio Hardware & Devices
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

            <div className="space-y-3.5 text-xs">
              {/* Camera Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                  <Camera className="h-3 w-3 text-purple-400" />
                  <span>Camera Device</span>
                </label>
                <select
                  value={selectedCameraId}
                  disabled={isSwitchingDevice}
                  onChange={(e) => handleSwitchCamera(e.target.value)}
                  className="w-full rounded-xl border border-[#262c3b] bg-[#0c0d14] px-3 py-2 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                  <Mic className="h-3 w-3 text-purple-400" />
                  <span>Microphone Device</span>
                </label>
                <select
                  value={selectedMicId}
                  disabled={isSwitchingDevice}
                  onChange={(e) => handleSwitchMic(e.target.value)}
                  className="w-full rounded-xl border border-[#262c3b] bg-[#0c0d14] px-3 py-2 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                  <Volume2 className="h-3 w-3 text-purple-400" />
                  <span>Audio Output / Speaker</span>
                </label>
                <select
                  value={selectedSpeakerId}
                  disabled={isSwitchingDevice}
                  onChange={(e) => handleSwitchSpeaker(e.target.value)}
                  className="w-full rounded-xl border border-[#262c3b] bg-[#0c0d14] px-3 py-2 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                >
                  {audioOutputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Speaker ${d.deviceId.substring(0, 5)}...`}
                    </option>
                  ))}
                  {audioOutputDevices.length === 0 && <option value="">System Default Audio</option>}
                </select>
              </div>

              {/* Acoustic & Multi-Track Recording Info */}
              <div className="rounded-xl border border-[#232736] bg-[#0c0d14] p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
                  <Headphones className="h-3.5 w-3.5 text-purple-400" />
                  <span>Isolated Hardware Capture</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your audio and video are recorded directly from your local hardware device before network compression, providing pristine studio-quality stems.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-bold text-white cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
