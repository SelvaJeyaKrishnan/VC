"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  VideoOff,
  Mic,
  MicOff,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Sliders,
} from "lucide-react";
import { useSelfieEnhancer } from "@/hooks/useSelfieEnhancer";
import { SelfieEnhancerControl } from "./SelfieEnhancerControl";

export function PreflightMediaTest({ onClose }: { onClose?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const enhancedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const enhancer = useSelfieEnhancer();

  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicActive, setIsMicActive] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  const [cameraLabel, setCameraLabel] = useState<string>("Default Camera");
  const [micLabel, setMicLabel] = useState<string>("Default Microphone");
  const [showEnhancerSettings, setShowEnhancerSettings] = useState(false);

  const startMedia = async () => {
    setIsLoading(true);
    setErrorText(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setHasPermission(true);

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

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (videoTrack?.label) setCameraLabel(videoTrack.label);
      if (audioTrack?.label) setMicLabel(audioTrack.label);

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
        console.warn("Could not start audio analyser meter:", audioErr);
      }
    } catch (err: unknown) {
      console.error("Local camera/mic permission error:", err);
      setHasPermission(false);
      const msg =
        err instanceof Error
          ? err.message
          : "Could not access camera or microphone. Please check browser permissions.";
      setErrorText(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startMedia();

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
  }, []);

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

  const toggleCamera = () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraActive(videoTrack.enabled);
    }
  };

  const toggleMic = () => {
    if (!streamRef.current) return;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicActive(audioTrack.enabled);
    }
  };

  return (
    <div className="w-full rounded-xl border border-[#1f242e] bg-[#13161c] p-4 sm:p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a1e26] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#c0915a]/15 text-[#c0915a] border border-[#c0915a]/30">
            <Camera className="h-3.5 w-3.5" />
          </div>
          <span className="font-heading text-xs sm:text-sm font-bold text-white">
            Camera & Microphone Diagnostics
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#8c94a4] hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {/* Video Viewport */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#0a0b0e] border border-[#1f242e] flex items-center justify-center">
        {isLoading && (
          <div className="flex flex-col items-center gap-2 text-[#8c94a4]">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#c0915a] border-t-transparent" />
            <span className="text-xs font-mono">Testing hardware stream...</span>
          </div>
        )}

        {!isLoading && hasPermission === false && (
          <div className="flex flex-col items-center p-6 text-center max-w-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h4 className="font-heading text-sm font-bold text-white mb-1">Camera Permission Blocked</h4>
            <p className="text-xs text-[#8c94a4] mb-4 leading-relaxed">
              {errorText || "Your browser has blocked camera/mic access for this site."}
            </p>
            <button
              type="button"
              onClick={startMedia}
              className="flex items-center gap-1.5 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] px-3.5 py-1.5 text-xs font-bold text-[#0a0b0e] transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Permissions</span>
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover scale-x-[-1] transition-opacity duration-300 ${
            hasPermission && isCameraActive ? "opacity-100" : "opacity-0"
          }`}
        />

        {!isLoading && hasPermission && !isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0b0e] text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#14171d] text-[#6b7280] mb-2 border border-[#1f242e]">
              <VideoOff className="h-6 w-6" />
            </div>
            <span className="text-xs text-[#8c94a4]">Camera preview paused</span>
          </div>
        )}

        {hasPermission && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded bg-[#0a0b0e]/90 px-2 py-0.5 text-[10px] font-mono font-medium text-[#10b981] border border-[#10b981]/30 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
            <span>PREVIEW</span>
          </div>
        )}

        {/* Enhancer Active Badge */}
        {enhancer.isEnabled && isCameraActive && hasPermission && !isLoading && (
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 rounded bg-[#0a0b0e]/90 px-2 py-0.5 text-[10px] font-semibold text-[#cf9f67] border border-[#c0915a]/30 backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-[#c0915a]" />
            <span>Enhancer {enhancer.strength}%</span>
            {enhancer.compareMode && (
              <span className="ml-1 text-[9px] text-[#82a4d4] border-l border-[#c0915a]/30 pl-1 font-bold">
                Compare
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mic Audio Level Meter */}
      {hasPermission && (
        <div className="mt-3.5 rounded-lg border border-[#1f242e] bg-[#0c0e12] p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#d1d5db]">
              <Mic className="h-3.5 w-3.5 text-[#c0915a]" />
              <span className="font-semibold text-[11px] uppercase tracking-wider text-[#8c94a4]">
                Microphone Input
              </span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-[#cf9f67]">
              {isMicActive ? (audioLevel > 5 ? "Audio Signal Detected" : "Listening...") : "Muted"}
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1a1e26]">
            <div
              className="h-full transition-all duration-75 rounded-full bg-[#c0915a]"
              style={{ width: isMicActive ? `${Math.max(4, audioLevel)}%` : "0%" }}
            />
          </div>
        </div>
      )}

      {/* Hardware Status & Controls */}
      <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-col text-[11px] text-[#8c94a4] text-left w-full sm:w-auto truncate">
          <span className="truncate">
            Camera: <strong className="text-[#d1d5db]">{cameraLabel}</strong>
          </span>
          <span className="truncate">
            Mic: <strong className="text-[#d1d5db]">{micLabel}</strong>
          </span>
        </div>

        {hasPermission && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={toggleCamera}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                isCameraActive
                  ? "bg-[#161a22] text-[#d1d5db] hover:bg-[#202534] border border-[#242a36]"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {isCameraActive ? <Camera className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
              <span>{isCameraActive ? "Mute Cam" : "Enable Cam"}</span>
            </button>

            <button
              type="button"
              onClick={toggleMic}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                isMicActive
                  ? "bg-[#161a22] text-[#d1d5db] hover:bg-[#202534] border border-[#242a36]"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {isMicActive ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              <span>{isMicActive ? "Mute Mic" : "Unmute Mic"}</span>
            </button>

            <button
              type="button"
              onClick={enhancer.toggleEnabled}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                enhancer.isEnabled
                  ? "bg-[#c0915a] text-[#0a0b0e]"
                  : "bg-[#161a22] text-[#d1d5db] hover:bg-[#202534] border border-[#242a36]"
              }`}
              title="Toggle Camera Enhancer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{enhancer.isEnabled ? "Enhancer On" : "Enhancer"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowEnhancerSettings(!showEnhancerSettings)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer border ${
                showEnhancerSettings
                  ? "bg-[#c0915a]/20 border-[#c0915a] text-[#cf9f67]"
                  : "bg-[#161a22] border-[#242a36] text-[#8c94a4] hover:text-white"
              }`}
              title="Enhancer Settings"
            >
              <Sliders className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Expandable Enhancer Console */}
      {hasPermission && showEnhancerSettings && (
        <div className="mt-4 border-t border-[#1a1e26] pt-4">
          <SelfieEnhancerControl
            config={enhancer.config}
            onToggleEnabled={enhancer.toggleEnabled}
            onSetStrength={enhancer.setStrength}
            onSetLighting={enhancer.setLighting}
            onSetSkinSmooth={enhancer.setSkinSmooth}
            onToggleCompare={enhancer.toggleCompareMode}
            onClose={() => setShowEnhancerSettings(false)}
            variant="embedded"
          />
        </div>
      )}
    </div>
  );
}
