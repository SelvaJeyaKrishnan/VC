"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Plus,
  Copy,
  Check,
  Video,
  Mic,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Lock,
  RefreshCw,
  Sparkles,
  Users,
  Radio,
  Clock,
  Download,
  Disc,
  FileVideo,
  Search,
  X,
} from "lucide-react";
import type { Interview } from "@/types/studio";
import type { RecordingSession } from "@/lib/recordingStore";

export function InterviewDashboard() {
  const router = useRouter();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [recordingsByRoom, setRecordingsByRoom] = useState<Record<string, RecordingSession>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [hostName, setHostName] = useState("Creator Host");
  const [guestName, setGuestName] = useState("");
  const [customPasscode, setCustomPasscode] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [intRes, recRes] = await Promise.all([
        fetch("/api/interviews"),
        fetch("/api/recordings"),
      ]);

      if (intRes.ok) {
        const intData = await intRes.json();
        setInterviews(intData.interviews || []);
      }

      if (recRes.ok) {
        const recData = await recRes.json();
        const map: Record<string, RecordingSession> = {};
        for (const s of recData.sessions || []) {
          map[s.roomId] = s;
        }
        setRecordingsByRoom(map);
      }
    } catch {
      // Ignore background fetch errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          hostName: hostName.trim() || "Creator Host",
          guestName: guestName.trim() || "Guest",
          passcode: customPasscode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create interview session");
      }

      setCreatedInviteUrl(data.inviteUrl);
      setTitle("");
      setGuestName("");
      setCustomPasscode("");
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating session");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this interview session?")) return;
    try {
      const res = await fetch(`/api/interviews/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setInterviews((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete interview:", err);
    }
  };

  const buildGuestLink = (interview: Interview) => {
    const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
    const guestQuery = interview.guestName ? `&name=${encodeURIComponent(interview.guestName)}` : "";
    return `${base}/?room=${encodeURIComponent(interview.id)}${guestQuery}`;
  };

  const handleCopyLink = async (interview: Interview) => {
    const url = buildGuestLink(interview);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(interview.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      prompt("Copy Guest Invite Link:", url);
    }
  };

  const handleJoinAsHost = (interview: Interview) => {
    const params = new URLSearchParams({
      role: "host",
      name: interview.hostName || "Creator Host",
      title: interview.title,
    });
    router.push(`/room/${encodeURIComponent(interview.id)}?${params.toString()}`);
  };

  const filteredInterviews = interviews.filter(
    (i) =>
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.hostName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.guestName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-6">
      {/* Top Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#202534] bg-[#141721] p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Interview Sessions & Studios
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage scheduled 1-on-1 recording sessions, generate guest links, and access isolated tracks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            title="Refresh sessions & recordings"
            className="rounded-xl border border-[#282d3d] bg-[#1a1e2b] p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-950/40 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.8]" />
            <span>New Interview</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      {interviews.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search interviews by title, ID, or participant..."
            className="w-full rounded-xl border border-[#232736] bg-[#12141c] pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
          />
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-lg rounded-2xl border border-[#282d3d] bg-[#12151f] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#232736] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Schedule New Remote Interview
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-2.5 text-xs text-rose-300 font-medium">
                {error}
              </div>
            )}

            {createdInviteUrl ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <Check className="h-4 w-4" />
                  <span>Interview Session Created Successfully!</span>
                </div>
                <p className="text-xs text-slate-300">
                  Send this private guest link to your interviewee:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdInviteUrl}
                    className="flex-1 rounded-xl border border-emerald-800 bg-black px-3 py-2 text-xs text-emerald-300 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdInviteUrl);
                      alert("Guest invite copied!");
                    }}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedInviteUrl(null);
                    setShowCreateModal(false);
                  }}
                  className="w-full mt-2 rounded-xl bg-slate-800 py-2 text-xs text-slate-300 font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Interview Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Episode 12: Building Generative Media"
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Host Name
                    </label>
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="e.g. Creator Host"
                      className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Guest Name
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Optional Room Passcode
                  </label>
                  <input
                    type="text"
                    value={customPasscode}
                    onChange={(e) => setCustomPasscode(e.target.value)}
                    placeholder="Leave blank for automatic secure code"
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-[#282d3d] px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !title.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{isCreating ? "Creating..." : "Save Session"}</span>
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Interviews List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            All Sessions ({filteredInterviews.length})
          </span>
          <span className="text-[11px] text-slate-500">Isolated 1 Host + 1 Guest Dynamic</span>
        </div>

        {filteredInterviews.length === 0 && !isLoading && (
          <div className="rounded-2xl border border-dashed border-[#232736] bg-[#10121a]/60 p-10 text-center space-y-3">
            <Calendar className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">
              {searchQuery ? "No matching interviews found" : "No interviews scheduled yet"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create a studio session to generate guest invite links and record multi-track video.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Interview</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {filteredInterviews.map((interview) => {
            const recording = recordingsByRoom[interview.id];
            const hasRecordings = recording && recording.tracks && recording.tracks.length > 0;

            return (
              <div
                key={interview.id}
                className="group rounded-2xl border border-[#202534] bg-gradient-to-b from-[#141722] to-[#0f1118] p-5 transition-all hover:border-[#2e3549] shadow-lg space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-lg">
                        {interview.id}
                      </span>
                      <h4 className="text-sm font-bold text-white truncate max-w-md">
                        {interview.title}
                      </h4>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#1d222e] text-slate-400 border border-[#293042]">
                        {interview.status}
                      </span>
                      {hasRecordings && (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          <Disc className="h-2.5 w-2.5 animate-pulse text-purple-400" />
                          <span>{recording.tracks.length} Tracks Recorded</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Mic className="h-3.5 w-3.5 text-purple-400" />
                        <span>
                          Host: <strong className="text-slate-200">{interview.hostName}</strong>
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-cyan-400" />
                        <span>
                          Guest:{" "}
                          <strong className="text-slate-200">{interview.guestName || "Any Guest"}</strong>
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(interview.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(interview)}
                      className="flex items-center gap-1.5 rounded-xl border border-[#282d3d] bg-[#1a1e2b] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-[#23283a] hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedId === interview.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Invite Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleJoinAsHost(interview)}
                      className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-purple-950/40 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Video className="h-3.5 w-3.5 stroke-[2.4]" />
                      <span>Enter Studio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(interview.id)}
                      title="Delete session"
                      className="rounded-xl border border-[#282d3d] p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Separate Multi-Track Recordings Download Drawer */}
                {hasRecordings && (
                  <div className="rounded-xl border border-[#202534] bg-[#0c0e14] p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                        <FileVideo className="h-3.5 w-3.5" />
                        <span>Isolated Raw Recording Tracks</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Duration: {recording.durationSeconds}s
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {recording.tracks.map((track) => (
                        <div
                          key={track.fileName}
                          className="flex items-center justify-between rounded-lg border border-[#222634] bg-[#12151f] px-3 py-2 text-xs"
                        >
                          <div className="space-y-0.5 truncate mr-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  track.role === "host"
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                }`}
                              >
                                {track.role}
                              </span>
                              <span className="font-semibold text-slate-200 truncate">
                                {track.participantName}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {(track.fileSize / (1024 * 1024)).toFixed(2)} MB • {track.fileName}
                            </span>
                          </div>

                          <a
                            href={track.downloadUrl}
                            download={track.fileName}
                            className="shrink-0 flex items-center gap-1 rounded-lg bg-[#1a1e2b] hover:bg-purple-600 hover:text-white px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
