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
  User,
  Users,
  Layers,
  Sparkles,
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
  const [isDownloadingAll, setIsDownloadingAll] = useState<string | null>(null);

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

  const handleDownloadAll = async (session: RecordingSession) => {
    setIsDownloadingAll(session.roomId);
    try {
      for (let i = 0; i < session.tracks.length; i++) {
        const track = session.tracks[i];
        const a = document.createElement("a");
        a.href = track.downloadUrl;
        a.download = track.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Small delay to prevent browser download popup blocking
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (err) {
      console.error("Batch download error:", err);
    } finally {
      setTimeout(() => setIsDownloadingAll(null), 1000);
    }
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
              Studio Recordings & Separate Tracks
            </h3>
            <span className="rounded bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider text-purple-300">
              Separate Stems
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Download pristine, isolated host and guest audio & video tracks for your post-production editing workflow.
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
            placeholder="Search recordings by title, room ID, or participant..."
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
              When you record in OneGuest Studio, each participant&apos;s audio and video track will automatically appear here for instant preview and isolated separate track downloads.
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
      <div className="space-y-6">
        {filteredSessions.map((session) => {
          const interview = interviewsMap[session.roomId];
          const sessionTitle = interview?.title || `Studio Session ${session.roomId}`;
          const hostName = interview?.hostName || "Creator Host";
          const guestName = interview?.guestName || "Guest Participant";

          // Group tracks by participant role & composite
          const hostTracks = session.tracks.filter((t) => t.role === "host");
          const guestTracks = session.tracks.filter((t) => t.role === "guest");
          const compositeTracks = session.tracks.filter((t) => t.trackType === "composite");

          const totalBytes = session.tracks.reduce((acc, t) => acc + (t.fileSize || 0), 0);

          return (
            <div
              key={session.roomId}
              className="rounded-2xl border border-[#202534] bg-[#13151f] overflow-hidden transition-all hover:border-[#2e3549] shadow-2xl"
            >
              {/* Riverside Session Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f232e] px-6 py-4 bg-[#0e1017]">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 shrink-0">
                    <FileVideo className="h-5 w-5 stroke-[2.2]" />
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
                        <span>Synchronized Stems</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-500" />
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
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span>{formatDuration(session.durationSeconds)}</span>
                      </span>
                      <span>•</span>
                      <span>
                        {session.tracks.length} Separate Track{session.tracks.length > 1 ? "s" : ""} ({formatFileSize(totalBytes)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Master Riverside Action: Download All Tracks */}
                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <button
                    type="button"
                    disabled={isDownloadingAll === session.roomId}
                    onClick={() => handleDownloadAll(session)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-950/40 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>
                      {isDownloadingAll === session.roomId
                        ? "Downloading Tracks..."
                        : "Download All Separate Tracks"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Riverside Participant Cards Grid */}
              <div className="p-5 space-y-4">
                {/* 1. Host Tracks Card */}
                {hostTracks.length > 0 && (
                  <div className="rounded-xl border border-[#232736] bg-[#0c0d14] p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1c1f2b] pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white text-xs font-bold ring-1 ring-purple-400/40">
                          {hostName[0]?.toUpperCase() || "H"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{hostName}</span>
                            <span className="rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider">
                              Host
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {hostTracks.length} Isolated Stem{hostTracks.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {hostTracks.map((track) => {
                        const isAudio = track.trackType === "audio" || track.mimeType.startsWith("audio");
                        const stemName = isAudio ? "Host Audio (Microphone Stem)" : "Host Video (1080p Camera Stem)";
                        const formatLabel = isAudio ? "WAV / 48kHz Opus" : "MP4 / WebM HD";

                        return (
                          <div
                            key={track.fileName}
                            className="flex items-center justify-between rounded-lg border border-[#1f232e] bg-[#12141c] p-3 hover:border-purple-500/40 transition-colors"
                          >
                            <div className="space-y-1 min-w-0 pr-3">
                              <div className="flex items-center gap-2">
                                <div className="p-1 rounded-md bg-purple-500/10 text-purple-400">
                                  {isAudio ? <Volume2 className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                                </div>
                                <span className="text-xs font-bold text-slate-200 truncate">
                                  {stemName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono pl-6">
                                <span className="text-slate-300 font-semibold">{formatFileSize(track.fileSize)}</span>
                                <span>•</span>
                                <span>{formatLabel}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewTrack({
                                    track,
                                    roomId: session.roomId,
                                    sessionTitle,
                                  })
                                }
                                className="rounded-lg border border-[#2b3144] bg-[#161924] hover:bg-[#1e2333] p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Preview track"
                              >
                                <Play className="h-3 w-3 fill-slate-300" />
                              </button>
                              <a
                                href={track.downloadUrl}
                                download={track.fileName}
                                className="flex items-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-500 px-2.5 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
                                title={`Download ${stemName}`}
                              >
                                <Download className="h-3 w-3" />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Guest Tracks Card */}
                {guestTracks.length > 0 && (
                  <div className="rounded-xl border border-[#232736] bg-[#0c0d14] p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1c1f2b] pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-600 text-white text-xs font-bold ring-1 ring-cyan-400/40">
                          {guestName[0]?.toUpperCase() || "G"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{guestName}</span>
                            <span className="rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider">
                              Guest
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {guestTracks.length} Isolated Stem{guestTracks.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {guestTracks.map((track) => {
                        const isAudio = track.trackType === "audio" || track.mimeType.startsWith("audio");
                        const stemName = isAudio ? "Guest Audio (Microphone Stem)" : "Guest Video (1080p Camera Stem)";
                        const formatLabel = isAudio ? "WAV / 48kHz Opus" : "MP4 / WebM HD";

                        return (
                          <div
                            key={track.fileName}
                            className="flex items-center justify-between rounded-lg border border-[#1f232e] bg-[#12141c] p-3 hover:border-cyan-500/40 transition-colors"
                          >
                            <div className="space-y-1 min-w-0 pr-3">
                              <div className="flex items-center gap-2">
                                <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400">
                                  {isAudio ? <Volume2 className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                                </div>
                                <span className="text-xs font-bold text-slate-200 truncate">
                                  {stemName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono pl-6">
                                <span className="text-slate-300 font-semibold">{formatFileSize(track.fileSize)}</span>
                                <span>•</span>
                                <span>{formatLabel}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewTrack({
                                    track,
                                    roomId: session.roomId,
                                    sessionTitle,
                                  })
                                }
                                className="rounded-lg border border-[#2b3144] bg-[#161924] hover:bg-[#1e2333] p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Preview track"
                              >
                                <Play className="h-3 w-3 fill-slate-300" />
                              </button>
                              <a
                                href={track.downloadUrl}
                                download={track.fileName}
                                className="flex items-center gap-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-2.5 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
                                title={`Download ${stemName}`}
                              >
                                <Download className="h-3 w-3" />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Composite Backup Card (if present) */}
                {compositeTracks.length > 0 && (
                  <div className="rounded-xl border border-[#232736] bg-[#0c0d14] p-4 space-y-2">
                    <div className="flex items-center justify-between border-b border-[#1c1f2b] pb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">Side-by-Side Composite Interview Video</span>
                        <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider">
                          Composite Backup
                        </span>
                      </div>
                    </div>

                    {compositeTracks.map((track) => (
                      <div
                        key={track.fileName}
                        className="flex items-center justify-between rounded-lg border border-[#1f232e] bg-[#12141c] p-3"
                      >
                        <div className="space-y-0.5 text-xs">
                          <span className="font-semibold text-slate-200">Synchronized Host & Guest Split View</span>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {formatFileSize(track.fileSize)} • MP4/WebM Broadcast
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewTrack({
                                track,
                                roomId: session.roomId,
                                sessionTitle,
                              })
                            }
                            className="rounded-lg border border-[#2b3144] bg-[#161924] hover:bg-[#1e2333] p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Preview track"
                          >
                            <Play className="h-3 w-3 fill-slate-300" />
                          </button>
                          <a
                            href={track.downloadUrl}
                            download={track.fileName}
                            className="flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download Composite</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Media Preview Modal (supports both video and dedicated audio tracks) */}
      {previewTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-3xl rounded-2xl border border-[#282d3d] bg-[#12141f] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232736] mb-4">
              <div className="flex items-center gap-2">
                {previewTrack.track.trackType === "audio" ||
                previewTrack.track.mimeType.startsWith("audio") ? (
                  <Volume2 className="h-4 w-4 text-purple-400" />
                ) : (
                  <FileVideo className="h-4 w-4 text-purple-400" />
                )}
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Raw Track Preview: {previewTrack.track.fileName} ({previewTrack.track.role})
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

            {previewTrack.track.trackType === "audio" ||
            previewTrack.track.mimeType.startsWith("audio") ? (
              /* Dedicated Audio Track Preview Player */
              <div className="flex flex-col items-center justify-center rounded-xl bg-[#0c0d14] p-8 border border-[#232736] space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Volume2 className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h5 className="text-sm font-bold text-white">
                    Isolated {previewTrack.track.role === "host" ? "Host" : "Guest"} Audio Track
                  </h5>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    48kHz Broadcast Opus • No cross-bleeding
                  </p>
                </div>
                <audio
                  src={previewTrack.track.downloadUrl}
                  controls
                  autoPlay
                  className="w-full max-w-md"
                />
              </div>
            ) : (
              /* Video / Composite Track Preview Player */
              <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-[#232736]">
                <video
                  src={previewTrack.track.downloadUrl}
                  controls
                  autoPlay
                  className="h-full w-full object-contain"
                />
              </div>
            )}

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
