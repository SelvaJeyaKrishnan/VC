"use client";

import {
  Disc,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
  Video,
  Mic,
  Film,
  Users,
  Clock,
  Layers,
} from "lucide-react";
import type { RecordingStatus, TrackItemInfo } from "@/hooks/useLocalRecorder";
import type { MissingTracksWarning } from "@/lib/recordingEngine";

interface RecordingBarProps {
  status: RecordingStatus;
  duration: number;
  fileSizeMb: number;
  uploadProgress: number;
  errorMessage: string | null;
  warningMessage?: string | null;
  localDownloadUrl: string | null;
  recordedTracks?: TrackItemInfo[];
  missingWarning?: MissingTracksWarning | null;
  role: "host" | "guest";
  onDismissError: () => void;
  onDismissWarning?: () => void;
  onDismissMissingWarning?: () => void;
  onConfirmSoloRecording?: () => void;
}

export function RecordingBar({
  status,
  duration,
  fileSizeMb,
  uploadProgress,
  errorMessage,
  warningMessage,
  localDownloadUrl,
  recordedTracks = [],
  missingWarning,
  role,
  onDismissError,
  onDismissWarning,
  onDismissMissingWarning,
  onConfirmSoloRecording,
}: RecordingBarProps) {
  if (
    status === "idle" &&
    !errorMessage &&
    !warningMessage &&
    !missingWarning &&
    (!recordedTracks || recordedTracks.length === 0)
  ) {
    return null;
  }

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTrackIcon = (trackType: string) => {
    if (trackType === "video") return <Video className="h-3 w-3" />;
    if (trackType === "audio") return <Mic className="h-3 w-3" />;
    return <Film className="h-3 w-3" />;
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 select-none space-y-2">
      {/* 0. Missing Tracks Warning / Pre-Flight Confirmation Modal Banner */}
      {missingWarning && status === "idle" && (
        <div className="rounded-xl border border-amber-500/60 bg-[#1a140d]/95 p-4 shadow-2xl backdrop-blur-md space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Notice: Multi-Participant Recording Check
              </h4>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                {missingWarning.message}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-amber-500/20">
            {onDismissMissingWarning && (
              <button
                type="button"
                onClick={onDismissMissingWarning}
                className="rounded-lg border border-slate-700 bg-[#161822] px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#202434] transition-colors cursor-pointer"
              >
                Wait for Guest
              </button>
            )}

            {onConfirmSoloRecording && (
              <button
                type="button"
                onClick={onConfirmSoloRecording}
                className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition-colors cursor-pointer"
              >
                Record Host Solo Only
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Active Recording Banner */}
      {status === "recording" && (
        <div className="rounded-xl border border-rose-500/60 bg-[#160d11]/95 p-3 sm:px-4 sm:py-3 shadow-2xl backdrop-blur-md space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                <span>REC</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white tracking-wider">
                  {formatTimer(duration)}
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-xs font-mono text-slate-300 font-semibold">
                  {fileSizeMb > 0 ? `${fileSizeMb} MB total` : "Capturing raw streams..."}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-rose-300 font-semibold font-mono">
              <Layers className="h-3.5 w-3.5 text-rose-400" />
              <span>Multi-Track Capture Active</span>
            </div>
          </div>

          {/* Individual Active Tracks Pills */}
          {recordedTracks.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-rose-950/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Capturing Tracks:
              </span>
              {recordedTracks.map((tr) => (
                <div
                  key={tr.id}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                    tr.role === "host"
                      ? "bg-purple-950/60 text-purple-300 border-purple-500/40"
                      : "bg-cyan-950/60 text-cyan-300 border-cyan-500/40"
                  }`}
                >
                  {getTrackIcon(tr.trackType)}
                  <span>{tr.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Finalizing Status Banner */}
      {status === "finalizing" && (
        <div className="flex items-center justify-between rounded-xl border border-purple-500/50 bg-[#121422]/95 px-4 py-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-purple-300 font-semibold">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            <span>Finalizing separate host & guest media tracks...</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Encoding VP9/Opus</span>
        </div>
      )}

      {/* 3. Uploading Progress Banner */}
      {status === "uploading" && (
        <div className="rounded-xl border border-purple-500/40 bg-[#141624]/90 px-4 py-3 shadow-2xl backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-300 font-semibold">
              <UploadCloud className="h-4 w-4 animate-bounce text-purple-400" />
              <span>Syncing separate host and guest tracks to studio library...</span>
            </div>
            <span className="font-mono text-xs text-purple-400 font-bold">{uploadProgress}%</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 4. Upload Completed Banner with Direct Download Links for All Tracks */}
      {status === "uploaded" && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 shadow-2xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Master Host & Guest recordings saved to studio library!</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
              Ready for Download
            </span>
          </div>

          {/* Download buttons for each individual deliverable */}
          {recordedTracks.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-emerald-900/60">
              {recordedTracks.map((tr) => (
                tr.downloadUrl ? (
                  <a
                    key={tr.id}
                    href={tr.downloadUrl}
                    download={tr.fileName}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white transition-colors cursor-pointer border border-emerald-500/40"
                    title={`Download ${tr.label}`}
                  >
                    <Download className="h-3 w-3" />
                    <span>{tr.label}</span>
                  </a>
                ) : null
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Warning Notification */}
      {warningMessage && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-950/60 px-4 py-2.5 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>{warningMessage}</span>
          </div>
          {onDismissWarning && (
            <button
              type="button"
              onClick={onDismissWarning}
              className="rounded p-1 text-amber-300 hover:text-white cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* 6. Error Banner with Emergency Local Download Links */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/80 p-3.5 shadow-2xl text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-200 font-semibold">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={onDismissError}
              className="rounded-lg p-1 text-rose-300 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Emergency local downloads if server upload failed */}
          {recordedTracks.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-rose-900/60">
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                Emergency Browser Backups:
              </span>
              {recordedTracks.map((tr) => (
                tr.downloadUrl ? (
                  <a
                    key={tr.id}
                    href={tr.downloadUrl}
                    download={tr.fileName}
                    className="flex items-center gap-1 rounded-md bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-xs font-bold text-slate-950 transition-colors cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    <span>{tr.label}</span>
                  </a>
                ) : null
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
