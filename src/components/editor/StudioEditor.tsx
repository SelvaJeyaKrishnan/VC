"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Sparkles,
  Download,
  FileText,
  Subtitles,
  Scissors,
  Search,
  Undo2,
  Check,
  ChevronLeft,
  Smartphone,
  Square,
  Tv,
  Layers,
  Clock,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { RecordingSession, RecordingTrack } from "@/lib/recordingStore";
import {
  type TranscriptData,
  type TranscriptWord,
  type TranscriptParagraph,
  type MagicClip,
  type EditorCut,
  generateSRT,
  generatePlainText,
} from "@/lib/transcriptEngine";

export type AspectRatioMode = "16:9" | "9:16" | "1:1";
export type CaptionStyle = "karaoke" | "clean" | "highlight" | "none";

interface StudioEditorProps {
  roomId: string;
}

export function StudioEditor({ roomId }: StudioEditorProps) {
  // Session & tracks state
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<RecordingTrack | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Transcript & cuts state
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSavingTranscript, setIsSavingTranscript] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  // Video playback state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [skipCuts, setSkipCuts] = useState(true);

  // Styling & presentation modes
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>("16:9");
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("karaoke");

  // Magic Clips modal
  const [showMagicClips, setShowMagicClips] = useState(false);
  const [magicClips, setMagicClips] = useState<MagicClip[]>([]);
  const [isLoadingClips, setIsLoadingClips] = useState(false);
  const [activeClip, setActiveClip] = useState<MagicClip | null>(null);

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load session tracks
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoadingSession(true);
        const res = await fetch(`/api/recordings?roomId=${encodeURIComponent(roomId)}`);
        if (res.ok) {
          const data = await res.json();
          const sess: RecordingSession = data.session;
          if (sess && isMounted) {
            setSession(sess);
            // Default to composite video or host-video
            const comp = sess.tracks?.find((t) => t.trackType === "composite" || t.fileName.includes("composite"));
            const hostVid = sess.tracks?.find((t) => t.role === "host" && (t.trackType === "video" || t.fileName.includes("video")));
            const firstVid = sess.tracks?.find((t) => t.trackType === "video" || t.mimeType.startsWith("video"));
            setSelectedTrack(comp || hostVid || firstVid || sess.tracks?.[0] || null);
          }
        }
      } catch (e) {
        console.error("Error loading session:", e);
      } finally {
        if (isMounted) setIsLoadingSession(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // Load transcript
  useEffect(() => {
    let isMounted = true;
    async function fetchTranscript() {
      try {
        setIsLoadingTranscript(true);
        const res = await fetch(`/api/recordings/transcript?roomId=${encodeURIComponent(roomId)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setTranscript(data);
        }
      } catch (e) {
        console.error("Error loading transcript:", e);
      } finally {
        if (isMounted) setIsLoadingTranscript(false);
      }
    }
    fetchTranscript();
    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // Load Magic Clips
  const loadMagicClips = useCallback(async () => {
    try {
      setIsLoadingClips(true);
      const res = await fetch(`/api/recordings/clips?roomId=${encodeURIComponent(roomId)}`);
      if (res.ok) {
        const data = await res.json();
        setMagicClips(data.clips || []);
      }
    } catch (e) {
      console.error("Error loading clips:", e);
    } finally {
      setIsLoadingClips(false);
    }
  }, [roomId]);

  // Handle video time updates & skip cut zones
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // If skip cuts is active, check if current time falls within any cut zone
    if (skipCuts && transcript?.cuts && transcript.cuts.length > 0) {
      for (const cut of transcript.cuts) {
        if (time >= cut.start && time < cut.end) {
          videoRef.current.currentTime = cut.end + 0.05;
          break;
        }
      }
    }

    // If active clip preview is playing and reaches end, pause or loop
    if (activeClip && time >= activeClip.end) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || session?.durationSeconds || 0);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const seekRelative = (delta: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(videoRef.current.duration || 9999, videoRef.current.currentTime + delta));
    videoRef.current.currentTime = target;
  };

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    if (!isPlaying) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  // Toggle word cut/deleted status
  const toggleWordCut = (word: TranscriptWord) => {
    if (!transcript) return;

    const newDeleted = !word.deleted;
    const updatedParagraphs = transcript.paragraphs.map((p) => {
      const updatedWords = p.words.map((w) => {
        if (w.id === word.id) {
          return { ...w, deleted: newDeleted };
        }
        return w;
      });
      return { ...p, words: updatedWords };
    });

    // Recompute cut segments
    const cuts: EditorCut[] = [];
    updatedParagraphs.forEach((p) => {
      let cutStart: number | null = null;
      let cutEnd: number | null = null;

      p.words.forEach((w) => {
        if (w.deleted) {
          if (cutStart === null) cutStart = w.start;
          cutEnd = w.end;
        } else {
          if (cutStart !== null && cutEnd !== null) {
            cuts.push({ id: `cut-${cutStart}`, start: cutStart, end: cutEnd });
            cutStart = null;
            cutEnd = null;
          }
        }
      });
      if (cutStart !== null && cutEnd !== null) {
        cuts.push({ id: `cut-${cutStart}`, start: cutStart, end: cutEnd });
      }
    });

    const updatedTranscript: TranscriptData = {
      ...transcript,
      paragraphs: updatedParagraphs,
      cuts,
      updatedAt: new Date().toISOString(),
    };

    setTranscript(updatedTranscript);
    saveTranscriptChanges(updatedTranscript);
  };

  const restoreAllCuts = () => {
    if (!transcript) return;
    const restoredParagraphs = transcript.paragraphs.map((p) => ({
      ...p,
      words: p.words.map((w) => ({ ...w, deleted: false })),
    }));
    const updated: TranscriptData = {
      ...transcript,
      paragraphs: restoredParagraphs,
      cuts: [],
      updatedAt: new Date().toISOString(),
    };
    setTranscript(updated);
    saveTranscriptChanges(updated);
  };

  const saveTranscriptChanges = async (data: TranscriptData) => {
    try {
      setIsSavingTranscript(true);
      await fetch("/api/recordings/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, transcript: data, cuts: data.cuts }),
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } catch (e) {
      console.error("Failed to save transcript:", e);
    } finally {
      setIsSavingTranscript(false);
    }
  };

  // Find currently active word for karaoke caption overlay
  const currentActiveWord = transcript?.paragraphs
    .flatMap((p) => p.words)
    .find((w) => !w.deleted && currentTime >= w.start && currentTime <= w.end);

  // Find active sentence/phrase for subtitles
  const currentActiveParagraph = transcript?.paragraphs.find(
    (p) => currentTime >= p.start && currentTime <= p.end
  );

  // Export handlers
  const downloadSRT = () => {
    if (!transcript) return;
    const srtContent = generateSRT(transcript.paragraphs);
    const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${roomId}-captions.srt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const downloadTranscriptText = () => {
    if (!transcript) return;
    const textContent = generatePlainText(transcript.paragraphs);
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${roomId}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const downloadVideo = () => {
    if (!selectedTrack) return;
    const a = document.createElement("a");
    a.href = selectedTrack.downloadUrl;
    a.download = `${roomId}-${aspectRatio.replace(":", "x")}-${selectedTrack.fileName}`;
    a.click();
    setShowExportMenu(false);
  };

  const previewMagicClip = (clip: MagicClip) => {
    setActiveClip(clip);
    setAspectRatio("9:16");
    seekTo(clip.start);
    setShowMagicClips(false);
  };

  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalCutsCount = transcript?.cuts?.length || 0;

  return (
    <div className="flex h-screen w-full flex-col bg-[#0a0b0e] text-[#f3f4f6] overflow-hidden select-none antialiased">
      {/* Top Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1a1e26] bg-[#0f1115]/95 px-4 sm:px-6 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/?tab=recordings"
            className="flex items-center gap-1 text-xs text-[#8c94a4] hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Recordings</span>
          </Link>
          <span className="text-[#323846]">/</span>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-white truncate max-w-[160px] sm:max-w-[260px]">
              Studio Editor
            </span>
            <span className="rounded bg-[#1a1e26] px-2 py-0.5 text-[11px] font-mono text-[#8c94a4]">
              {roomId}
            </span>
          </div>
          {savedNotice && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#10b981] animate-fade-in">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </div>

        {/* Center: Aspect Ratio & Caption Style Controls */}
        <div className="hidden md:flex items-center gap-2">
          {/* Aspect Ratio Switcher */}
          <div className="flex items-center rounded-lg border border-[#1f242e] bg-[#14171d] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setAspectRatio("16:9")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                aspectRatio === "16:9"
                  ? "bg-[#242a36] text-white font-semibold shadow-sm"
                  : "text-[#8c94a4] hover:text-[#d1d5db]"
              }`}
              title="16:9 Landscape (Full Studio / YouTube)"
            >
              <Tv className="h-3.5 w-3.5" />
              <span>16:9</span>
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio("9:16")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                aspectRatio === "9:16"
                  ? "bg-[#c0915a] text-[#0a0b0e] font-bold shadow-sm"
                  : "text-[#8c94a4] hover:text-[#d1d5db]"
              }`}
              title="9:16 Vertical Shorts (Reels, TikTok, Shorts)"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>9:16</span>
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio("1:1")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                aspectRatio === "1:1"
                  ? "bg-[#242a36] text-white font-semibold shadow-sm"
                  : "text-[#8c94a4] hover:text-[#d1d5db]"
              }`}
              title="1:1 Square (Instagram, LinkedIn)"
            >
              <Square className="h-3.5 w-3.5" />
              <span>1:1</span>
            </button>
          </div>

          {/* Subtitle / Caption Preset Selector */}
          <div className="flex items-center rounded-lg border border-[#1f242e] bg-[#14171d] px-2 py-1 text-xs text-[#8c94a4]">
            <Subtitles className="h-3.5 w-3.5 text-[#c0915a] mr-1.5" />
            <select
              value={captionStyle}
              onChange={(e) => setCaptionStyle(e.target.value as CaptionStyle)}
              className="bg-transparent text-xs text-[#d1d5db] focus:outline-none cursor-pointer"
            >
              <option value="karaoke" className="bg-[#14171d]">Karaoke Glow</option>
              <option value="clean" className="bg-[#14171d]">Clean Box</option>
              <option value="highlight" className="bg-[#14171d]">Bold Highlight</option>
              <option value="none" className="bg-[#14171d]">Captions Off</option>
            </select>
          </div>
        </div>

        {/* Right: Magic Clips & Export Actions */}
        <div className="flex items-center gap-2">
          {/* AI Magic Clips Trigger */}
          <button
            type="button"
            onClick={() => {
              setShowMagicClips(true);
              if (magicClips.length === 0) loadMagicClips();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-[#c0915a]/40 bg-[#c0915a]/10 hover:bg-[#c0915a]/20 px-3 py-1.5 text-xs font-semibold text-[#cf9f67] transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
            title="Generate AI Magic Clips"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#c0915a]" />
            <span className="hidden sm:inline">Magic Clips</span>
          </button>

          {/* Export Menu Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] px-3.5 py-1.5 text-xs font-bold text-[#0a0b0e] transition-colors cursor-pointer shadow-md"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[#242a36] bg-[#14171d] p-1.5 shadow-2xl z-50">
                <button
                  type="button"
                  onClick={downloadVideo}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-white hover:bg-[#1f242e] rounded-lg transition-colors text-left cursor-pointer"
                >
                  <Download className="h-4 w-4 text-[#c0915a]" />
                  <div>
                    <div>Export Video ({aspectRatio})</div>
                    <div className="text-[10px] text-[#8c94a4] font-normal">Active edits & cuts applied</div>
                  </div>
                </button>
                <div className="h-px bg-[#1f242e] my-1" />
                <button
                  type="button"
                  onClick={downloadSRT}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#d1d5db] hover:bg-[#1f242e] rounded-lg transition-colors text-left cursor-pointer"
                >
                  <Subtitles className="h-4 w-4 text-[#38bdf8]" />
                  <div>
                    <div>Subtitles (.srt)</div>
                    <div className="text-[10px] text-[#8c94a4] font-normal">Synchronized timecodes</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={downloadTranscriptText}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#d1d5db] hover:bg-[#1f242e] rounded-lg transition-colors text-left cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-[#10b981]" />
                  <div>
                    <div>Clean Transcript (.txt)</div>
                    <div className="text-[10px] text-[#8c94a4] font-normal">Speaker attributed text</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Grid (Left Transcript + Right Player) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Text Transcript Editor */}
        <section className="flex flex-col w-full md:w-[440px] lg:w-[480px] shrink-0 border-r border-[#1a1e26] bg-[#0c0e12]">
          {/* Transcript Search & Controls Bar */}
          <div className="flex items-center justify-between border-b border-[#1a1e26] px-4 py-2.5 bg-[#0f1115]/60 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8c94a4]" />
              <input
                type="text"
                placeholder="Search transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-[#242a36] bg-[#14171d] pl-8 pr-3 py-1 text-xs text-white placeholder-[#8c94a4] focus:outline-none focus:border-[#c0915a]"
              />
            </div>

            {totalCutsCount > 0 && (
              <button
                type="button"
                onClick={restoreAllCuts}
                className="flex items-center gap-1 rounded border border-[#242a36] bg-[#14171d] px-2 py-1 text-[11px] text-[#cf9f67] hover:bg-[#1f242e] transition-colors cursor-pointer"
                title="Restore all deleted words"
              >
                <Undo2 className="h-3 w-3" />
                <span>Restore ({totalCutsCount})</span>
              </button>
            )}
          </div>

          {/* Transcript Flow */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {isLoadingTranscript ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#8c94a4] gap-2">
                <div className="h-5 w-5 border-2 border-[#c0915a] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Generating speech transcript...</span>
              </div>
            ) : transcript?.paragraphs && transcript.paragraphs.length > 0 ? (
              transcript.paragraphs.map((para) => (
                <div key={para.id} className="group flex flex-col gap-1.5 text-xs">
                  {/* Speaker Label & Timestamp */}
                  <div className="flex items-center justify-between text-[#8c94a4]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#c0915a]" />
                      <span className="font-bold text-white uppercase text-[11px] tracking-wider">
                        {para.speakerName}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#6b7280]">
                      {formatTimecode(para.start)}
                    </span>
                  </div>

                  {/* Words Flow */}
                  <div className="leading-relaxed bg-[#13161c]/40 rounded-lg p-2.5 border border-transparent hover:border-[#1f242e] transition-colors">
                    {para.words.map((w) => {
                      const isActive = currentTime >= w.start && currentTime <= w.end;
                      const isDeleted = !!w.deleted;
                      const matchesSearch = searchQuery && w.word.toLowerCase().includes(searchQuery.toLowerCase());

                      return (
                        <span
                          key={w.id}
                          onClick={() => seekTo(w.start)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            toggleWordCut(w);
                          }}
                          className={`inline-block mr-1 my-0.5 px-1 py-0.5 rounded cursor-pointer transition-all ${
                            isDeleted
                              ? "line-through opacity-30 text-rose-400 bg-rose-950/30"
                              : isActive
                              ? "bg-[#c0915a] text-[#0a0b0e] font-bold shadow-sm scale-105"
                              : matchesSearch
                              ? "bg-amber-400/20 text-amber-200 border-b border-amber-400"
                              : "text-[#d1d5db] hover:bg-[#242a36] hover:text-white"
                          }`}
                          title={`Click to seek (${formatTimecode(w.start)}) • Right click to cut/delete`}
                        >
                          {w.word}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-xs text-[#8c94a4]">
                No transcript available for this recording session.
              </div>
            )}
          </div>

          {/* Transcript Footer Helper */}
          <div className="border-t border-[#1a1e26] px-4 py-2 bg-[#0a0b0e] text-[10px] text-[#8c94a4] flex items-center justify-between">
            <span>Tip: Right-click any word to cut it from the video</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={skipCuts}
                onChange={(e) => setSkipCuts(e.target.checked)}
                className="rounded border-[#242a36] bg-[#14171d] text-[#c0915a]"
              />
              <span>Auto-skip cuts</span>
            </label>
          </div>
        </section>

        {/* Right: Video Canvas & Synchronized Player */}
        <section className="flex flex-1 flex-col bg-[#08090b] overflow-hidden">
          {/* Video Preview Center Stage */}
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
            {selectedTrack ? (
              <div
                className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-black border border-[#1f242e] shadow-2xl transition-all duration-300 ${
                  aspectRatio === "9:16"
                    ? "h-full max-h-[75vh] aspect-[9/16]"
                    : aspectRatio === "1:1"
                    ? "h-full max-h-[75vh] aspect-square"
                    : "w-full max-w-4xl aspect-video"
                }`}
              >
                <video
                  ref={videoRef}
                  src={selectedTrack.downloadUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={togglePlay}
                  muted={isMuted}
                  playsInline
                  className="h-full w-full object-cover cursor-pointer"
                />

                {/* Live Synchronized Caption Overlay */}
                {captionStyle !== "none" && currentActiveParagraph && (
                  <div className="absolute bottom-6 left-4 right-4 pointer-events-none flex justify-center z-10">
                    {captionStyle === "karaoke" ? (
                      <div className="rounded-lg bg-black/80 px-4 py-2 backdrop-blur-md max-w-md text-center border border-white/10 shadow-xl">
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {currentActiveParagraph.words
                            .filter((w) => !w.deleted)
                            .map((w) => {
                              const isThisWord = currentActiveWord?.id === w.id;
                              return (
                                <span
                                  key={w.id}
                                  className={
                                    isThisWord
                                      ? "text-[#c0915a] underline decoration-2 underline-offset-4 font-black"
                                      : "text-[#d1d5db]"
                                  }
                                >
                                  {w.word}{" "}
                                </span>
                              );
                            })}
                        </span>
                      </div>
                    ) : captionStyle === "highlight" ? (
                      <div className="bg-yellow-400 px-3 py-1.5 shadow-2xl rounded text-center max-w-sm">
                        <span className="text-xs sm:text-sm font-black text-black uppercase tracking-tight">
                          {currentActiveWord?.word || currentActiveParagraph.text.slice(0, 30)}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded bg-black/90 px-3.5 py-1.5 text-center max-w-md border border-white/10">
                        <span className="text-xs text-white font-medium">
                          {currentActiveParagraph.words
                            .filter((w) => !w.deleted)
                            .map((w) => w.word)
                            .join(" ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Floating Active Clip Indicator */}
                {activeClip && (
                  <div className="absolute top-3 left-3 bg-[#c0915a] text-[#0a0b0e] px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 shadow-md">
                    <Sparkles className="h-3 w-3" />
                    <span>Clip: {activeClip.title}</span>
                    <button
                      type="button"
                      onClick={() => setActiveClip(null)}
                      className="ml-1 hover:text-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-xs text-[#8c94a4]">
                No recorded video track available to preview in this session.
              </div>
            )}
          </div>

          {/* Player Transport Bar */}
          <div className="border-t border-[#1a1e26] bg-[#0c0e12] px-6 py-2.5 flex items-center justify-between gap-4 text-xs">
            {/* Play/Pause & Skips */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => seekRelative(-5)}
                className="p-1.5 rounded text-[#8c94a4] hover:text-white hover:bg-[#1a1e26] transition-colors"
                title="Rewind 5s"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0a0b0e] hover:bg-[#d1d5db] transition-colors shadow-md cursor-pointer"
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => seekRelative(5)}
                className="p-1.5 rounded text-[#8c94a4] hover:text-white hover:bg-[#1a1e26] transition-colors"
                title="Forward 5s"
              >
                <RotateCw className="h-4 w-4" />
              </button>

              <div className="font-mono text-xs text-[#d1d5db] ml-2">
                <span>{formatTimecode(currentTime)}</span>
                <span className="text-[#6b7280]"> / </span>
                <span className="text-[#8c94a4]">{formatTimecode(duration)}</span>
              </div>
            </div>

            {/* Track Switcher & Speed Controls */}
            <div className="flex items-center gap-3">
              {/* Isolated Stems Track Selector */}
              {session?.tracks && session.tracks.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-[#8c94a4]">
                  <Layers className="h-3.5 w-3.5 text-[#c0915a]" />
                  <select
                    value={selectedTrack?.fileName || ""}
                    onChange={(e) => {
                      const t = session.tracks.find((item) => item.fileName === e.target.value);
                      if (t) setSelectedTrack(t);
                    }}
                    className="bg-[#14171d] border border-[#242a36] rounded px-2 py-1 text-xs text-white focus:outline-none"
                  >
                    {session.tracks.map((t) => (
                      <option key={t.fileName} value={t.fileName}>
                        {t.trackType === "composite"
                          ? "Composite Interview"
                          : `${t.participantName} (${t.trackType || t.role})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Playback speed selector */}
              <div className="flex items-center gap-1 bg-[#14171d] rounded border border-[#242a36] px-2 py-1">
                {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleRateChange(rate)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      playbackRate === rate ? "bg-[#c0915a] text-[#0a0b0e] font-bold" : "text-[#8c94a4] hover:text-white"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Mute button */}
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="p-1.5 rounded text-[#8c94a4] hover:text-white hover:bg-[#1a1e26] transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Bottom Waveform & Multi-Track Timeline */}
          <div className="h-28 border-t border-[#1a1e26] bg-[#090b0e] p-3 flex flex-col justify-between select-none">
            {/* Timeline Header Info */}
            <div className="flex items-center justify-between text-[11px] text-[#8c94a4]">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">Timeline</span>
                <span>{transcript?.cuts?.length || 0} cut regions</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      const t = videoRef.current.currentTime;
                      // Add a small 2s cut at playhead
                      const newCut: EditorCut = { id: `cut-${t}`, start: t, end: Math.min(duration, t + 2) };
                      const updated = {
                        ...transcript!,
                        cuts: [...(transcript?.cuts || []), newCut],
                      };
                      setTranscript(updated);
                      saveTranscriptChanges(updated);
                    }
                  }}
                  className="flex items-center gap-1 rounded bg-[#1a1e26] px-2 py-0.5 text-[10px] text-[#cf9f67] hover:bg-[#242a36] transition-colors cursor-pointer"
                >
                  <Scissors className="h-3 w-3" />
                  <span>Split at Playhead</span>
                </button>
              </div>
            </div>

            {/* Interactive Timeline Track */}
            <div
              className="relative h-14 w-full rounded bg-[#13161c] border border-[#1f242e] overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = clickX / rect.width;
                const targetTime = ratio * (duration || 1);
                seekTo(targetTime);
              }}
            >
              {/* Simulated Audio Waveform Bars */}
              <div className="absolute inset-0 flex items-center justify-between px-2 opacity-30 pointer-events-none">
                {Array.from({ length: 64 }).map((_, i) => {
                  const h = 20 + Math.sin(i * 0.4) * 15 + ((i % 3) * 10);
                  return (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-[#c0915a]"
                      style={{ height: `${h}%` }}
                    />
                  );
                })}
              </div>

              {/* Render Cut / Deleted Regions on Timeline */}
              {transcript?.cuts?.map((cut) => {
                const startRatio = (cut.start / (duration || 1)) * 100;
                const widthRatio = ((cut.end - cut.start) / (duration || 1)) * 100;
                return (
                  <div
                    key={cut.id}
                    className="absolute top-0 bottom-0 bg-rose-950/80 border-x border-rose-500/60 z-10 flex items-center justify-center text-[10px] font-mono text-rose-300"
                    style={{ left: `${startRatio}%`, width: `${widthRatio}%` }}
                    title={`Cut: ${formatTimecode(cut.start)} - ${formatTimecode(cut.end)}`}
                  >
                    ✂
                  </div>
                );
              })}

              {/* Playhead Indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
                style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
              >
                <div className="absolute -top-1 -left-1.5 h-3 w-3 rounded-full bg-rose-500" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* AI Magic Clips Drawer / Modal */}
      {showMagicClips && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[#242a36] bg-[#0f1115] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c0915a]/20 text-[#c0915a]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-white text-base">
                    AI Magic Clips
                  </h3>
                  <p className="text-xs text-[#8c94a4]">
                    High-engagement moments detected and cropped into 9:16 vertical shorts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMagicClips(false)}
                className="p-1 rounded text-[#8c94a4] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingClips ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-xs text-[#8c94a4]">
                <div className="h-6 w-6 border-2 border-[#c0915a] border-t-transparent rounded-full animate-spin" />
                <span>Scanning transcript and audio dynamics for viral hooks...</span>
              </div>
            ) : magicClips.length > 0 ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {magicClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[#1f242e] bg-[#14171d] hover:border-[#c0915a]/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          {clip.viralityScore}% Virality Score
                        </span>
                        <span className="text-[11px] font-mono text-[#8c94a4]">
                          {clip.duration}s ({formatTimecode(clip.start)} - {formatTimecode(clip.end)})
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{clip.title}</h4>
                      <p className="text-xs text-[#8c94a4] italic line-clamp-2">
                        &quot;{clip.quote}&quot;
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        {clip.tags.map((t) => (
                          <span key={t} className="text-[10px] text-[#cf9f67] font-mono">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => previewMagicClip(clip)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#242a36] bg-[#1a1e26] hover:bg-[#242a36] px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
                      >
                        <Play className="h-3 w-3" />
                        <span>Preview 9:16</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          previewMagicClip(clip);
                          downloadVideo();
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] px-3 py-1.5 text-xs font-bold text-[#0a0b0e] transition-colors cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>Export Short</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[#8c94a4]">
                No clips generated yet. Click &quot;Scan Transcript&quot; to detect highlights.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
