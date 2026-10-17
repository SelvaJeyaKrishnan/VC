"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileVideo,
  Download,
  Play,
  Clock,
  HardDrive,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Disc,
  X,
  Volume2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Video,
} from "lucide-react";
import type { RecordingSession, RecordingTrack } from "@/lib/recordingStore";
import type { Interview } from "@/types/studio";

interface RecordingsLibraryProps {
  onStartSession?: () => void;
}

export function RecordingsLibrary({ onStartSession }: RecordingsLibraryProps) {
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [interviewsMap, setInterviewsMap] = useState<Record<string, Interview>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTrack, setPreviewTrack] = useState<{
    track: RecordingTrack;
    roomId: string;
    sessionTitle?: string;
  } | null>(null);

  const loadRecordings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recRes, intRes] = await Promise.all([
        fetch("/api/recordings"),
        fetch("/api/interviews"),
      ]);

      if (recRes.ok) {
        const data = await recRes.json();
        setSessions(data.sessions || []);
      }

      if (intRes.ok) {
        const intData = await intRes.json();
        const map: Record<string, Interview> = {};
        for (const i of intData.interviews || []) {
          map[i.id] = i;
        }
        setInterviewsMap(map);
      }
    } catch (err) {
      console.error("Failed to fetch recordings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredSessions = sessions.filter((s) => {
    const interviewTitle = interviewsMap[s.roomId]?.title || "";
    return (
      s.roomId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interviewTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tracks.some((t) =>
        t.participantName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  });

  return (
    <div className="space-y-6">
      {/* Top action & search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#202534] bg-[#141721] p-5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileVideo className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Studio Recordings Library
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Uncompressed, local multi-track recordings captured directly on host and guest hardware.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadRecordings}
            className="flex items-center gap-1.5 rounded-xl border border-[#282d3d] bg-[#1a1e2b] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#23283a] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      {sessions.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by session title, room ID, or participant..."
            className="w-full rounded-xl border border-[#232736] bg-[#12141c] pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
          />
        </div>
      )}

      {/* Empty State */}
      {filteredSessions.length === 0 && !isLoading && (
        <div className="rounded-2xl border border-dashed border-[#232736] bg-[#12141c]/50 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <FileVideo className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {searchQuery ? "No matching recordings found" : "No recordings captured yet"}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              When you record in OneGuest Studio, each participant&apos;s audio and video track will sync here for instant preview and separate track downloads.
            </p>
          </div>
          {onStartSession && (
            <button
              type="button"
              onClick={onStartSession}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-950/40 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Disc className="h-3.5 w-3.5" />
              <span>Launch Studio Session</span>
            </button>
          )}
        </div>
      )}

      {/* Recording Sessions List */}
      <div className="space-y-4">
        {filteredSessions.map((session) => {
          const interview = interviewsMap[session.roomId];
          const sessionTitle = interview?.title || `Studio Session ${session.roomId}`;

          return (
            <div
              key={session.roomId}
              className="rounded-2xl border border-[#202534] bg-[#141721] overflow-hidden transition-all hover:border-[#2e3549] shadow-lg"
            >
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f232e] px-5 py-4 bg-[#11131a]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    <FileVideo className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        {sessionTitle}
                      </h4>
                      <span className="font-mono text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                        {session.roomId}
                      </span>
                      <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        <span>Synchronized</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(session.recordedAt).toLocaleDateString()} at{" "}
                          {new Date(session.recordedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(session.durationSeconds)}</span>
                      </span>
                      <span>•</span>
                      <span>
                        {session.tracks.length} Separate Track
                        {session.tracks.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono self-start sm:self-auto">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-[11px]">Lossless Hardware Capture</span>
                </div>
              </div>

              {/* Tracks Grid */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {session.tracks.map((track) => (
                  <div
                    key={track.fileName}
                    className="flex items-center justify-between rounded-xl border border-[#232736] bg-[#0c0d14] p-3.5 hover:border-[#2f3549] transition-colors"
                  >
                    <div className="space-y-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                            track.role === "host"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          }`}
                        >
                          {track.role}
                        </span>
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {track.participantName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span className="font-semibold text-slate-300">{formatFileSize(track.fileSize)}</span>
                        <span>•</span>
                        <span>{track.mimeType.includes("mp4") ? "MP4 (H.264)" : "WEBM (VP9/Opus)"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewTrack({
                            track,
                            roomId: session.roomId,
                            sessionTitle,
                          })
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-[#2b3144] bg-[#161924] hover:bg-[#1e2333] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                        title="Preview in browser"
                      >
                        <Play className="h-3 w-3 fill-slate-300" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={track.downloadUrl}
                        download={track.fileName}
                        className="flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
                        title="Download raw uncompressed track"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Preview Modal */}
      {previewTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-3xl rounded-2xl border border-[#282d3d] bg-[#12141f] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232736] mb-4">
              <div className="flex items-center gap-2">
                <FileVideo className="h-4 w-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Raw Track Preview: {previewTrack.track.participantName} ({previewTrack.track.role})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTrack(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-[#232736]">
              <video
                src={previewTrack.track.downloadUrl}
                controls
                autoPlay
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-4 mt-2">
              <span className="text-xs text-slate-400 font-mono">
                {previewTrack.track.fileName} • {formatFileSize(previewTrack.track.fileSize)}
              </span>

              <a
                href={previewTrack.track.downloadUrl}
                download={previewTrack.track.fileName}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Master Track</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
