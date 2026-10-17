"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Radio,
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Activity,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tv,
} from "lucide-react";
import type { StreamDestination, LiveStreamSession } from "@/app/api/studio/stream/route";

interface LiveStreamModalProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  onStreamStateChange?: (isLive: boolean) => void;
}

export function LiveStreamModal({
  roomId,
  isOpen,
  onClose,
  onStreamStateChange,
}: LiveStreamModalProps) {
  const [streamSession, setStreamSession] = useState<LiveStreamSession | null>(null);
  const [destinations, setDestinations] = useState<StreamDestination[]>([]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveDuration, setLiveDuration] = useState(0);

  // Load stream configuration
  const loadStreamConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/studio/stream?roomId=${encodeURIComponent(roomId)}`);
      if (res.ok) {
        const data: LiveStreamSession = await res.json();
        setStreamSession(data);
        setDestinations(data.destinations || []);
        if (onStreamStateChange) onStreamStateChange(data.isLive);
      }
    } catch (e) {
      console.error("Failed to load stream config:", e);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, onStreamStateChange]);

  useEffect(() => {
    if (isOpen) {
      loadStreamConfig();
    }
  }, [isOpen, loadStreamConfig]);

  // Live timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (streamSession?.isLive && streamSession.startedAt) {
      const startMs = new Date(streamSession.startedAt).getTime();
      interval = setInterval(() => {
        setLiveDuration(Math.floor((Date.now() - startMs) / 1000));
      }, 1000);
    } else {
      setLiveDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [streamSession?.isLive, streamSession?.startedAt]);

  if (!isOpen) return null;

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdateDestination = (
    id: string,
    field: keyof StreamDestination,
    value: string | boolean
  ) => {
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleAddCustomDestination = () => {
    const newDest: StreamDestination = {
      id: `dest-custom-${Date.now()}`,
      platform: "custom",
      name: "Custom RTMP",
      rtmpUrl: "rtmp://",
      streamKey: "",
      enabled: true,
    };
    setDestinations((prev) => [...prev, newDest]);
  };

  const handleRemoveDestination = (id: string) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
  };

  const saveDestinations = async () => {
    try {
      setIsUpdating(true);
      setErrorMessage(null);
      const res = await fetch("/api/studio/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          action: "save_destinations",
          destinations,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save stream configuration");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleBroadcast = async () => {
    try {
      setIsUpdating(true);
      setErrorMessage(null);
      const nextAction = streamSession?.isLive ? "stop" : "start";

      // Save first
      await fetch("/api/studio/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          action: "save_destinations",
          destinations,
        }),
      });

      const res = await fetch("/api/studio/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          action: nextAction,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to toggle broadcast");
      }

      setStreamSession(data.session);
      if (onStreamStateChange) onStreamStateChange(data.session.isLive);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Broadcast operation failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const activeCount = destinations.filter((d) => d.enabled && d.streamKey.trim().length > 0).length;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-[#242a36] bg-[#0f1115] p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1a1e26] pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                streamSession?.isLive
                  ? "bg-rose-500/20 text-rose-400 animate-pulse"
                  : "bg-[#c0915a]/15 text-[#c0915a]"
              }`}
            >
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-white text-base">
                  Live Streaming Destinations
                </h3>
                {streamSession?.isLive && (
                  <span className="rounded bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8c94a4]">
                Simulcast studio feed to YouTube, Twitch, Facebook, or custom RTMP
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8c94a4] hover:text-white hover:bg-[#1f242e] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-900/60 bg-rose-950/60 px-3.5 py-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Broadcast Telemetry (If Live) */}
        {streamSession?.isLive && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
              <div>
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                  Broadcasting Live
                </span>
                <div className="font-mono text-xs text-white">
                  {formatTimer(liveDuration)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-[#d1d5db]">
              <div>
                <span className="text-[10px] text-[#8c94a4] block">BITRATE</span>
                <span>{streamSession.health?.bitrateKbps || 4500} kbps</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8c94a4] block">OUTPUT</span>
                <span>{streamSession.health?.resolution || "1080p"} @ {streamSession.health?.fps || 60}fps</span>
              </div>
            </div>
          </div>
        )}

        {/* Destination Cards List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-xs text-[#8c94a4] gap-2">
              <div className="h-5 w-5 border-2 border-[#c0915a] border-t-transparent rounded-full animate-spin" />
              <span>Loading streaming destinations...</span>
            </div>
          ) : (
            destinations.map((dest) => (
              <div
                key={dest.id}
                className={`rounded-xl border p-3.5 transition-all ${
                  dest.enabled
                    ? "border-[#c0915a]/40 bg-[#14171d]"
                    : "border-[#1f242e] bg-[#0c0e12] opacity-75"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={dest.enabled}
                      onChange={(e) =>
                        handleUpdateDestination(dest.id, "enabled", e.target.checked)
                      }
                      className="rounded border-[#242a36] bg-[#14171d] text-[#c0915a] focus:ring-[#c0915a]"
                    />
                    <span className="font-bold text-sm text-white">{dest.name}</span>
                  </div>

                  {dest.platform === "custom" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDestination(dest.id)}
                      className="text-[#8c94a4] hover:text-rose-400 p-1"
                      title="Remove Destination"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {dest.enabled && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-[#1f242e]">
                    <div>
                      <label className="block text-[10px] font-medium text-[#8c94a4] mb-1">
                        RTMP URL
                      </label>
                      <input
                        type="text"
                        value={dest.rtmpUrl}
                        onChange={(e) =>
                          handleUpdateDestination(dest.id, "rtmpUrl", e.target.value)
                        }
                        placeholder="rtmp://..."
                        className="w-full rounded border border-[#242a36] bg-[#090b0e] px-2.5 py-1.5 text-xs font-mono text-[#d1d5db] focus:border-[#c0915a] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-[#8c94a4] mb-1">
                        Stream Key
                      </label>
                      <div className="relative">
                        <input
                          type={showKeys[dest.id] ? "text" : "password"}
                          value={dest.streamKey}
                          onChange={(e) =>
                            handleUpdateDestination(dest.id, "streamKey", e.target.value)
                          }
                          placeholder="Paste stream key here..."
                          className="w-full rounded border border-[#242a36] bg-[#090b0e] pl-2.5 pr-8 py-1.5 text-xs font-mono text-[#cf9f67] focus:border-[#c0915a] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(dest.id)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8c94a4] hover:text-white"
                        >
                          {showKeys[dest.id] ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          <button
            type="button"
            onClick={handleAddCustomDestination}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#242a36] hover:border-[#c0915a] py-2 text-xs text-[#8c94a4] hover:text-[#cf9f67] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Custom RTMP Destination</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#1a1e26] pt-4 mt-3 flex items-center justify-between">
          <div className="text-xs text-[#8c94a4]">
            {activeCount} destination{activeCount === 1 ? "" : "s"} ready
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveDestinations}
              disabled={isUpdating}
              className="rounded-lg border border-[#242a36] bg-[#14171d] hover:bg-[#1a1e26] px-3 py-2 text-xs font-semibold text-[#d1d5db] transition-colors cursor-pointer"
            >
              Save Keys
            </button>

            <button
              type="button"
              onClick={toggleBroadcast}
              disabled={isUpdating || (!streamSession?.isLive && activeCount === 0)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                streamSession?.isLive
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-[#c0915a] hover:bg-[#cf9f67] text-[#0a0b0e]"
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>
                {streamSession?.isLive
                  ? "End Broadcast"
                  : `Go Live (${activeCount})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
