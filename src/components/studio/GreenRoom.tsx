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
  const [showEnhancerSettings, setShowEnhancerSettings] = useState(false);

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
  }, [selectedCamera, selectedMic, refreshDevices]);

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
    <div className="min-h-screen bg-[#0d0f15] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 select-none">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#202534]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                Green Room • Device Setup
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {sessionTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="rounded-lg border border-[#232736] bg-[#141721] px-3 py-1.5 text-purple-300 font-semibold">
              Room: {roomId}
            </span>
            <span className="rounded-lg border border-[#232736] bg-[#141721] px-2.5 py-1.5 uppercase font-bold text-slate-300 text-[10px]">
              {role}
            </span>
          </div>
        </div>

        {/* Setup Console: 2 Columns (Riverside Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Large Live Video Canvas (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#232736] bg-[#10121a] shadow-2xl flex items-center justify-center">
              {isLoading && (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                  <span className="text-xs font-mono">Initializing media hardware...</span>
                </div>
              )}

              {permissionError && !isLoading && (
                <div className="flex flex-col items-center p-6 text-center max-w-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Permissions Required</h4>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">{permissionError}</p>
                  <button
                    type="button"
                    onClick={startPreview}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0f16] text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#161922] text-slate-500 mb-2 border border-[#232736]">
                    <VideoOff className="h-7 w-7" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Camera turned off</span>
                </div>
              )}

              {/* Selfie Enhancer Active Badge */}
              {enhancer.isEnabled && isCameraOn && !permissionError && !isLoading && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-full bg-purple-950/85 px-3 py-1 text-[11px] font-semibold text-purple-200 border border-purple-500/40 backdrop-blur-md shadow-lg">
                  <Sparkles className="h-3 w-3 text-purple-400 animate-pulse" />
                  <span>Enhancer: {enhancer.strength}%</span>
                  {enhancer.compareMode && (
                    <span className="ml-1 text-[10px] text-cyan-300 border-l border-purple-500/40 pl-1.5 font-bold">
                      Split Compare
                    </span>
                  )}
                </div>
              )}

              {/* Floating Bottom Cam, Mic & Enhancer Pill */}
              {!permissionError && !isLoading && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 rounded-full bg-[#0d0f16]/90 px-4 py-2 backdrop-blur-md border border-[#282d3d] shadow-xl z-20">
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all cursor-pointer ${
                      isCameraOn
                        ? "bg-[#181c26] text-slate-200 hover:bg-[#222736]"
                        : "bg-rose-600 text-white hover:bg-rose-500"
                    }`}
                    title={isCameraOn ? "Mute Camera" : "Unmute Camera"}
                  >
                    {isCameraOn ? <Camera className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleMic}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all cursor-pointer ${
                      isMicOn
                        ? "bg-[#181c26] text-slate-200 hover:bg-[#222736]"
                        : "bg-rose-600 text-white hover:bg-rose-500"
                    }`}
                    title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={enhancer.toggleEnabled}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all cursor-pointer relative ${
                      enhancer.isEnabled
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-950/60 ring-2 ring-purple-400/50"
                        : "bg-[#181c26] text-slate-200 hover:bg-[#222736]"
                    }`}
                    title={
                      enhancer.isEnabled
                        ? `Selfie Enhancer Active (${enhancer.strength}%) • Click to toggle`
                        : "Turn On Selfie Enhancer"
                    }
                  >
                    <Sparkles className="h-4 w-4" />
                    {enhancer.isEnabled && (
                      <span className="absolute top-1 right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* High-Precision Riverside Audio VU Meter */}
            {!permissionError && !isLoading && (
              <div className="rounded-xl border border-[#232736] bg-[#141721] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Mic className="h-3.5 w-3.5 text-purple-400" />
                    <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">
                      Microphone Signal
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-purple-300">
                    {isMicOn ? (audioLevel > 5 ? "Signal Active" : "Quiet") : "Muted"}
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-[#0c0e14] border border-[#1f232e]">
                  <div
                    className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400"
                    style={{ width: isMicOn ? `${Math.max(3, audioLevel)}%` : "0%" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Device Selectors, Participant Name & Join (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-[#232736] bg-[#141721] p-5 sm:p-6 shadow-xl">
              <form onSubmit={handleJoin} className="space-y-4">
                {/* Display Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Your Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Camera Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Camera
                  </label>
                  <select
                    value={selectedCamera}
                    onChange={(e) => setSelectedCamera(e.target.value)}
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Microphone
                  </label>
                  <select
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                  >
                    {audioInputDevices.map((dev) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Microphone ${dev.deviceId.substring(0, 5)}...`}
                      </option>
                    ))}
                    {audioInputDevices.length === 0 && <option value="">Default Microphone</option>}
                  </select>
                </div>

                {/* Speaker Selector & Test Chime */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Speaker / Output
                    </label>
                    <button
                      type="button"
                      onClick={handleTestSpeaker}
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="h-3 w-3" />
                      <span>{testSoundPlaying ? "Playing..." : "Test Sound"}</span>
                    </button>
                  </div>
                  <select
                    value={selectedSpeaker}
                    onChange={(e) => setSelectedSpeaker(e.target.value)}
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                  >
                    {audioOutputDevices.map((dev) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Speaker ${dev.deviceId.substring(0, 5)}...`}
                      </option>
                    ))}
                    {audioOutputDevices.length === 0 && <option value="">System Default Audio</option>}
                  </select>
                </div>

                {/* Selfie Enhancer Setup & Real-Time Tuning */}
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
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-5 py-3.5 text-xs font-bold shadow-xl shadow-purple-950/50 active:scale-[0.98] disabled:opacity-50 transition-all pt-2.5 cursor-pointer"
                >
                  <span>Join Studio</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            {/* Riverside Acoustic Guidance Box */}
            <div className="rounded-xl border border-[#232736] bg-[#141721] p-3.5 text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-[11px]">
                <Headphones className="h-3.5 w-3.5 text-purple-400" />
                <span>Headphones Recommended</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Wearing headphones prevents microphone bleed, ensuring clear, uncompromised multi-track audio recordings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
