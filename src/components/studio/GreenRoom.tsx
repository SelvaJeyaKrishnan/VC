"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Radio,
  Check,
  Headphones,
  Sliders,
  Settings,
} from "lucide-react";
import type { ParticipantRole } from "@/types/studio";
import { SelfieEnhancerControl } from "./SelfieEnhancerControl";
import { useSelfieEnhancer } from "@/hooks/useSelfieEnhancer";

interface GreenRoomProps {
  roomId: string;
  sessionTitle?: string;
  initialName?: string;
  role: ParticipantRole;
  onEnterStudio: (settings: {
    name: string;
    cameraId: string;
    microphoneId: string;
    speakerId: string;
  }) => void;
}

export function GreenRoom({
  roomId,
  sessionTitle = "Remote Interview",
  initialName = "",
  role,
  onEnterStudio,
}: GreenRoomProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const enhancedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const enhancer = useSelfieEnhancer();

  const [displayName, setDisplayName] = useState(
    initialName || (role === "host" ? "Creator Host" : "Guest")
  );

  // Device lists
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);

  // Selected device IDs
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");

  // Media states
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  // Lifecycle & permission states
  const [isLoading, setIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [testSoundPlaying, setTestSoundPlaying] = useState(false);

  // Enumerate all available audio and video devices
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vInputs = devices.filter((d) => d.kind === "videoinput");
      const aInputs = devices.filter((d) => d.kind === "audioinput");
      const aOutputs = devices.filter((d) => d.kind === "audiooutput");

      setVideoDevices(vInputs);
      setAudioInputDevices(aInputs);
      setAudioOutputDevices(aOutputs);

      if (vInputs.length > 0 && !selectedCamera) {
        setSelectedCamera(vInputs[0].deviceId);
      }
      if (aInputs.length > 0 && !selectedMic) {
        setSelectedMic(aInputs[0].deviceId);
      }
      if (aOutputs.length > 0 && !selectedSpeaker) {
        setSelectedSpeaker(aOutputs[0].deviceId);
      }
    } catch (err) {
      console.warn("Device enumeration error:", err);
    }
  }, [selectedCamera, selectedMic, selectedSpeaker]);

  // Start or switch media stream
  const startPreview = useCallback(async () => {
    setIsLoading(true);
    setPermissionError(null);

    // Stop current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCamera
          ? { deviceId: { exact: selectedCamera }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: selectedMic
          ? { deviceId: { exact: selectedMic }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (enhancer.isEnabled && enhancer.processor) {
        try {
          const enhanced = await enhancer.processor.attachToStream(stream);
          enhancedStreamRef.current = enhanced;
          if (videoRef.current) {
            videoRef.current.srcObject = enhanced;
          }
        } catch {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } else {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }

      await refreshDevices();

      // Setup VU Audio Meter with Web Audio API
      try {
        const audioCtx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateAudioMeter = () => {
          if (!streamRef.current || !streamRef.current.active) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const normalized = Math.min(100, Math.round((average / 128) * 100));
          setAudioLevel(normalized);

          animationFrameRef.current = requestAnimationFrame(updateAudioMeter);
        };

        updateAudioMeter();
      } catch (audioErr) {
        console.warn("Audio meter setup error:", audioErr);
      }
    } catch (err: unknown) {
      console.error("Failed to acquire camera/microphone:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Could not access camera or microphone. Please check browser permissions.";
      setPermissionError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCamera, selectedMic, refreshDevices, enhancer.isEnabled, enhancer.processor]);

  useEffect(() => {
    startPreview();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (enhancedStreamRef.current) {
        enhancedStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [startPreview]);

  // Reactively attach or detach enhancer when toggled in Green Room
  useEffect(() => {
    if (!streamRef.current || !videoRef.current) return;
    if (enhancer.isEnabled && enhancer.processor) {
      enhancer.processor
        .attachToStream(streamRef.current)
        .then((enhanced) => {
          enhancedStreamRef.current = enhanced;
          if (videoRef.current) {
            videoRef.current.srcObject = enhanced;
          }
        })
        .catch(() => {});
    } else {
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
    }
  }, [enhancer.isEnabled, enhancer.processor]);

  // Toggle Camera in preview
  const handleToggleCamera = () => {
    if (!streamRef.current) return;
    const vTrack = streamRef.current.getVideoTracks()[0];
    if (vTrack) {
      vTrack.enabled = !vTrack.enabled;
      setIsCameraOn(vTrack.enabled);
    }
  };

  // Toggle Mic in preview
  const handleToggleMic = () => {
    if (!streamRef.current) return;
    const aTrack = streamRef.current.getAudioTracks()[0];
    if (aTrack) {
      aTrack.enabled = !aTrack.enabled;
      setIsMicOn(aTrack.enabled);
    }
  };

  // Play test chime through selected audio output
  const handleTestSpeaker = () => {
    try {
      setTestSoundPlaying(true);
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);

      setTimeout(() => {
        setTestSoundPlaying(false);
        ctx.close().catch(() => {});
      }, 400);
    } catch {
      setTestSoundPlaying(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (enhancedStreamRef.current) {
      enhancedStreamRef.current.getTracks().forEach((t) => t.stop());
      enhancedStreamRef.current = null;
    }

    onEnterStudio({
      name: displayName.trim(),
      cameraId: selectedCamera,
      microphoneId: selectedMic,
      speakerId: selectedSpeaker,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-[#f3f4f6] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 select-none">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1a1e26]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#c0915a] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#cf9f67]">
                Green Room • Device Setup
              </span>
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight">
              {sessionTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#8c94a4]">
            <span className="rounded-md border border-[#1f242e] bg-[#13161c] px-3 py-1 text-[#cf9f67] font-semibold">
              Studio: {roomId}
            </span>
            <span className="rounded-md border border-[#1f242e] bg-[#13161c] px-2.5 py-1 uppercase font-bold text-[#d1d5db] text-[10px]">
              {role}
            </span>
          </div>
        </div>

        {/* Setup Console: 2 Columns (Riverside Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Large Live Video Canvas (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#1f242e] bg-[#13161c] shadow-lg flex items-center justify-center">
              {isLoading && (
                <div className="flex flex-col items-center gap-2 text-[#8c94a4]">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#c0915a] border-t-transparent" />
                  <span className="text-xs font-mono">Initializing camera feed...</span>
                </div>
              )}

              {permissionError && !isLoading && (
                <div className="flex flex-col items-center p-6 text-center max-w-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h4 className="font-heading text-sm font-bold text-white mb-1">Permissions Required</h4>
                  <p className="text-xs text-[#8c94a4] mb-4 leading-relaxed">{permissionError}</p>
                  <button
                    type="button"
                    onClick={startPreview}
                    className="flex items-center gap-1.5 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] px-4 py-2 text-xs font-bold text-[#0a0b0e] transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry Hardware Access</span>
                  </button>
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                  !permissionError && isCameraOn ? "opacity-100" : "opacity-0"
                }`}
              />

              {!isLoading && !permissionError && !isCameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0b0e] text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#14171d] text-[#6b7280] mb-2 border border-[#1f242e]">
                    <VideoOff className="h-6 w-6" />
                  </div>
                  <span className="text-xs text-[#8c94a4] font-medium">Camera turned off</span>
                </div>
              )}

              {/* Camera Enhancer Active Badge */}
              {enhancer.isEnabled && isCameraOn && !permissionError && !isLoading && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-md bg-[#0a0b0e]/90 px-2.5 py-1 text-[11px] font-semibold text-[#cf9f67] border border-[#c0915a]/40 backdrop-blur-md">
                  <Sparkles className="h-3 w-3 text-[#c0915a]" />
                  <span>Enhancer: {enhancer.strength}%</span>
                  {enhancer.compareMode && (
                    <span className="ml-1 text-[10px] text-[#82a4d4] border-l border-[#c0915a]/40 pl-1.5 font-bold">
                      Compare
                    </span>
                  )}
                </div>
              )}

              {/* Floating Bottom Cam, Mic & Enhancer Controls */}
              {!permissionError && !isLoading && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-[#0a0b0e]/90 px-3 py-1.5 backdrop-blur-md border border-[#242a36] shadow-md z-20">
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    className={`flex h-9 w-9 items-center justify-center rounded-md transition-all cursor-pointer ${
                      isCameraOn
                        ? "bg-[#181c24] text-[#d1d5db] hover:bg-[#222732] hover:text-white"
                        : "bg-rose-600 text-white hover:bg-rose-500"
                    }`}
                    title={isCameraOn ? "Mute Camera" : "Unmute Camera"}
                  >
                    {isCameraOn ? <Camera className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleMic}
                    className={`flex h-9 w-9 items-center justify-center rounded-md transition-all cursor-pointer ${
                      isMicOn
                        ? "bg-[#181c24] text-[#d1d5db] hover:bg-[#222732] hover:text-white"
                        : "bg-rose-600 text-white hover:bg-rose-500"
                    }`}
                    title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={enhancer.toggleEnabled}
                    className={`flex h-9 w-9 items-center justify-center rounded-md transition-all cursor-pointer relative ${
                      enhancer.isEnabled
                        ? "bg-[#c0915a] text-[#0a0b0e] font-bold"
                        : "bg-[#181c24] text-[#d1d5db] hover:bg-[#222732] hover:text-white"
                    }`}
                    title={
                      enhancer.isEnabled
                        ? `Camera Enhancer Active (${enhancer.strength}%) • Click to toggle`
                        : "Turn On Camera Enhancer"
                    }
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Precision Audio VU Meter */}
            {!permissionError && !isLoading && (
              <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#d1d5db]">
                  <div className="flex items-center gap-2">
                    <Mic className="h-3.5 w-3.5 text-[#c0915a]" />
                    <span className="font-semibold text-[11px] uppercase tracking-wider text-[#8c94a4]">
                      Microphone Input
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-[#cf9f67]">
                    {isMicOn ? (audioLevel > 5 ? "Signal Active" : "Quiet") : "Muted"}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0a0b0e] border border-[#1a1e26]">
                  <div
                    className="h-full rounded-full transition-all duration-75 bg-[#c0915a]"
                    style={{ width: isMicOn ? `${Math.max(3, audioLevel)}%` : "0%" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Device Selectors, Participant Name & Join (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-5 sm:p-6 shadow-sm">
              <form onSubmit={handleJoin} className="space-y-4">
                {/* Display Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#8c94a4] mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3.5 py-2 text-xs text-white placeholder-[#6b7280] focus:border-[#c0915a] focus:outline-none transition-colors"
                  />
                </div>

                {/* Camera Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8c94a4] mb-1">
                    Camera
                  </label>
                  <select
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-[#d1d5db] focus:border-[#c0915a] focus:outline-none"
                  >
                    {videoDevices.map((dev) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Camera ${dev.deviceId.substring(0, 5)}...`}
                      </option>
                    ))}
                    {videoDevices.length === 0 && <option value="">Default Camera</option>}
                  </select>
                </div>

                {/* Microphone Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8c94a4] mb-1">
                    Microphone
                  </label>
                  <select
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                    className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-[#d1d5db] focus:border-[#c0915a] focus:outline-none"
                  >
                    {audioInputDevices.map((dev) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Microphone ${dev.deviceId.substring(0, 5)}...`}
                      </option>
                    ))}
                    {audioInputDevices.length === 0 && <option value="">Default Microphone</option>}
                  </select>
                </div>

                {/* Speaker Selector & Test Sound */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#8c94a4]">
                      Output / Speaker
                    </label>
                    <button
                      type="button"
                      onClick={handleTestSpeaker}
                      className="text-[11px] text-[#c0915a] hover:text-[#cf9f67] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="h-3 w-3" />
                      <span>{testSoundPlaying ? "Playing..." : "Test Audio"}</span>
                    </button>
                  </div>
                  <select
                    value={selectedSpeaker}
                    onChange={(e) => setSelectedSpeaker(e.target.value)}
                    className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-[#d1d5db] focus:border-[#c0915a] focus:outline-none"
                  >
                    {audioOutputDevices.map((dev) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Speaker ${dev.deviceId.substring(0, 5)}...`}
                      </option>
                    ))}
                    {audioOutputDevices.length === 0 && <option value="">System Default Audio</option>}
                  </select>
                </div>

                {/* Camera Enhancer Controls */}
                <div className="pt-1">
                  <SelfieEnhancerControl
                    config={enhancer.config}
                    onToggleEnabled={enhancer.toggleEnabled}
                    onSetStrength={enhancer.setStrength}
                    onSetLighting={enhancer.setLighting}
                    onSetSkinSmooth={enhancer.setSkinSmooth}
                    onToggleCompare={enhancer.toggleCompareMode}
                    variant="embedded"
                  />
                </div>

                {/* Join Studio Button */}
                <button
                  type="submit"
                  disabled={!displayName.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] text-[#0a0b0e] px-5 py-3 text-xs font-bold shadow-md shadow-[#c0915a]/20 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                >
                  <span>Join Studio</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Acoustic Guidance Box */}
            <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-3.5 text-xs text-[#8c94a4] space-y-1.5">
              <div className="flex items-center gap-2 text-[#d1d5db] font-semibold text-[11px]">
                <Headphones className="h-3.5 w-3.5 text-[#c0915a]" />
                <span>Headphones Recommended</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Wearing headphones prevents echo and bleed, ensuring clean separate audio tracks for editing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
