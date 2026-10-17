"use client";

import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
  Video,
  Mic,
  Film,
  Users,
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
  recordedTracks = [],
  missingWarning,
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
      {/* 0. Missing Tracks Warning Modal Banner */}
      {missingWarning && status === "idle" && (
        <div className="rounded-xl border border-amber-500/40 bg-[#18130d] p-4 shadow-lg space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-amber-300">
                Notice: Multi-Participant Recording Check
              </h4>
              <p className="text-xs text-[#d1d5db] leading-relaxed">
                {missingWarning.message}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-amber-500/20">
            {onDismissMissingWarning && (
              <button
                type="button"
                onClick={onDismissMissingWarning}
                className="rounded-lg border border-[#242a36] bg-[#14171d] px-3.5 py-1.5 text-xs font-semibold text-[#d1d5db] hover:text-white transition-colors cursor-pointer"
              >
                Wait for Guest
              </button>
            )}

            {onConfirmSoloRecording && (
              <button
                type="button"
                onClick={onConfirmSoloRecording}
                className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-[#0a0b0e] transition-colors cursor-pointer"
              >
                Record Host Solo Only
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Active Recording Banner */}
      {status === "recording" && (
        <div className="rounded-xl border border-rose-500/50 bg-[#160d10] p-3 sm:px-4 sm:py-2.5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                <span>REC</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-white tracking-wider">
                  {formatTimer(duration)}
                </span>
                <span className="text-[#6b7280] text-xs">•</span>
                <span className="text-xs font-mono text-[#d1d5db]">
                  {fileSizeMb > 0 ? `${fileSizeMb} MB total` : "Capturing streams..."}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-rose-300 font-mono">
              <Layers className="h-3.5 w-3.5 text-rose-400" />
              <span>Multi-Track Stems Active</span>
            </div>
          </div>

          {/* Individual Active Tracks Pills */}
          {recordedTracks.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-rose-950/80">
              <span className="text-[10px] text-[#8c94a4] font-bold uppercase tracking-wider">
                Capturing:
              </span>
              {recordedTracks.map((tr) => (
                <div
                  key={tr.id}
                  className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border ${
                    tr.role === "host"
                      ? "bg-[#c0915a]/15 text-[#cf9f67] border-[#c0915a]/30"
                      : "bg-[#4c6a92]/15 text-[#82a4d4] border-[#4c6a92]/30"
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
        <div className="flex items-center justify-between rounded-xl border border-[#c0915a]/40 bg-[#13161c] px-4 py-2.5 shadow-md">
          <div className="flex items-center gap-2 text-xs text-[#cf9f67] font-semibold">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#c0915a] border-t-transparent" />
            <span>Finalizing separate host & guest media tracks...</span>
          </div>
          <span className="text-[11px] font-mono text-[#8c94a4]">Encoding Stems</span>
        </div>
      )}

      {/* 3. Uploading Progress Banner */}
      {status === "uploading" && (
        <div className="rounded-xl border border-[#c0915a]/30 bg-[#13161c] px-4 py-3 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#cf9f67] font-semibold">
              <UploadCloud className="h-4 w-4 animate-bounce text-[#c0915a]" />
              <span>Syncing separate tracks to studio library...</span>
            </div>
            <span className="font-mono text-xs text-[#c0915a] font-bold">{uploadProgress}%</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1a1e26]">
            <div
              className="h-full bg-[#c0915a] transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 4. Upload Completed Banner */}
      {status === "uploaded" && (
        <div className="rounded-xl border border-[#10b981]/30 bg-[#0e1f18] p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#10b981] font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Host & Guest recordings saved to studio library!</span>
            </div>
            <span className="font-mono text-[10px] text-[#10b981] bg-[#10b981]/15 px-2 py-0.5 rounded border border-[#10b981]/30">
              Ready
            </span>
          </div>

          {recordedTracks.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#134e35]">
              {recordedTracks.map((tr) => (
                tr.downloadUrl ? (
                  <a
                    key={tr.id}
                    href={tr.downloadUrl}
                    download={tr.fileName}
                    className="flex items-center gap-1.5 rounded bg-[#10b981] hover:bg-[#059669] px-2.5 py-1 text-xs font-bold text-[#0a0b0e] transition-colors cursor-pointer"
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

      {/* 6. Error Banner */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/80 p-3.5 shadow-lg text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-200 font-semibold">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={onDismissError}
              className="rounded p-1 text-rose-300 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

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
                    className="flex items-center gap-1 rounded bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-xs font-bold text-[#0a0b0e] transition-colors cursor-pointer"
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
